import {
    DateHelper,
    DBHelper, IpBlacklistCategoryDB,
    IpBlacklistCategoryServiceDB,
    IpBlacklistDB, IpBlacklistMaintainerDB, IpBlacklistMaintainerServiceDB,
    IpBlacklistServiceDB, IpListMaintainerDB, IpListMaintainerServiceDB,
    Logger
} from 'flyingfish_core';
import {Job, scheduleJob} from 'node-schedule';
import {Firehol} from '../Provider/Firehol/Firehol.js';
import {Settings as GlobalSettings} from '../Settings/Settings.js';

/**
 * BlacklistService
 */
export class BlacklistService {

    /**
     * instance
     * @private
     */
    private static _instance: BlacklistService|null = null;

    /**
     * getInstance
     */
    public static getInstance(): BlacklistService {
        if (BlacklistService._instance === null) {
            BlacklistService._instance = new BlacklistService();
        }

        return BlacklistService._instance;
    }

    /**
     * scheduler job
     * @protected
     */
    protected _scheduler: Job|null = null;

    /**
     * update
     */
    public async update(): Promise<void> {
        const importer = await GlobalSettings.getSetting(
            GlobalSettings.BLACKLIST_IMPORTER,
            GlobalSettings.BLACKLIST_IMPORTER_DEFAULT
        );

        if (importer === '') {
            Logger.getLogger().silly('BlacklistService::update: disabled');
            return;
        }

        const lastUpdate = parseInt(await GlobalSettings.getSetting(
            GlobalSettings.BLACKLIST_IMPORTER_LASTUPDATE,
            '0'
        ), 10) ?? 0;

        if (lastUpdate > 0) {
            if (!DateHelper.isOverAHour(lastUpdate, 24)) {
                Logger.getLogger().silly('BlacklistService::update: wait for time over ...');
                return;
            }
        }

        await GlobalSettings.setSetting(
            GlobalSettings.BLACKLIST_IMPORTER_LASTUPDATE,
            `${DateHelper.getCurrentDbTime()}`
        );

        // -------------------------------------------------------------------------------------------------------------

        const fh = new Firehol();
        await fh.loadList();

        const ipSetParsers = fh.getIpSets().values();

        for await (const ipSetParser of ipSetParsers) {
            let ipListMaintainer;

            const meta = ipSetParser.getMeta();
            const catenum = ipSetParser.getBlacklistCategory();

            // add maintainer infos ------------------------------------------------------------------------------------

            if (meta.maintainer) {

                ipListMaintainer = await IpListMaintainerServiceDB.getInstance().findByMaintainerName(meta.maintainer);

                if (!ipListMaintainer) {
                    const nIpListMaintainer = new IpListMaintainerDB();

                    nIpListMaintainer.maintainer_name = meta.maintainer!;
                    nIpListMaintainer.maintainer_url = meta.maintainer_url ? meta.maintainer_url : '';
                    nIpListMaintainer.list_source_url = meta.list_source_url ? meta.list_source_url : '';

                    ipListMaintainer = await IpListMaintainerServiceDB.getInstance().save(nIpListMaintainer);
                }
            }

            // add ips -------------------------------------------------------------------------------------------------

            for await (const ipSet of ipSetParser.getIps()) {
                let ipBlacklistEntry = await IpBlacklistServiceDB.getInstance().findByIp(ipSet.ip);

                if (!ipBlacklistEntry) {
                    const blackEntry = new IpBlacklistDB();
                    blackEntry.ip = ipSet.ip;
                    blackEntry.is_imported = true;
                    blackEntry.disabled = false;

                    ipBlacklistEntry = await DBHelper.getDataSource().manager.save(blackEntry);
                }

                if (ipBlacklistEntry) {

                    // check have category -----------------------------------------------------------------------------

                    if (catenum) {
                        const blackCate = await IpBlacklistCategoryServiceDB.getInstance().findByIpAndCatnum(ipBlacklistEntry.id, catenum);

                        if (!blackCate) {
                            const nBlackCate = new IpBlacklistCategoryDB();

                            nBlackCate.ip_id = ipBlacklistEntry.id;
                            nBlackCate.cat_num = catenum;

                            await DBHelper.getDataSource().manager.save(nBlackCate);
                        }
                    }

                    // link maintainer ---------------------------------------------------------------------------------

                    if (ipListMaintainer) {
                        const blackMaintainer =
                            await IpBlacklistMaintainerServiceDB.getInstance().findByIp(
                                ipBlacklistEntry.id,
                                ipListMaintainer.id
                            );

                        if (!blackMaintainer) {
                            const nBlackMaintainer = new IpBlacklistMaintainerDB();
                            nBlackMaintainer.ip_id = ipBlacklistEntry.id;
                            nBlackMaintainer.ip_maintainer_id = ipListMaintainer.id;

                            await IpBlacklistMaintainerServiceDB.getInstance().save(nBlackMaintainer);
                        }
                    }

                    // update blacklist entry --------------------------------------------------------------------------

                    ipBlacklistEntry!.last_update = DateHelper.getCurrentDbTime();

                    await IpBlacklistServiceDB.getInstance().save(ipBlacklistEntry);
                }
            }
        }
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        await this.update();

        this._scheduler = scheduleJob('1 1 * * *', async() => {
            await this.update();
        });
    }

}