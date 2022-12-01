import {Job, scheduleJob} from 'node-schedule';
import {DBHelper} from '../Db/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../Db/MariaDb/Entity/IpBlacklist.js';
import {IpBlacklistCategory as IpBlacklistCategoryDB} from '../Db/MariaDb/Entity/IpBlacklistCategory.js';
import {IpBlacklistMaintainer as IpBlacklistMaintainerDB} from '../Db/MariaDb/Entity/IpBlacklistMaintainer.js';
import {IpListMaintainer as IpListMaintainerDB} from '../Db/MariaDb/Entity/IpListMaintainer.js';
import {Logger} from '../Logger/Logger.js';
import {Firehol} from '../Provider/Firehol/Firehol.js';
import {Settings as GlobalSettings} from '../Settings/Settings.js';
import {DateHelper} from '../Utils/DateHelper.js';

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

        const fh = new Firehol();
        await fh.loadList();

        const ipListMaintainerRepository = DBHelper.getRepository(IpListMaintainerDB);
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);
        const ipBlacklistCategoryRepository = DBHelper.getRepository(IpBlacklistCategoryDB);
        const ipBlacklistMaintainerRepository = DBHelper.getRepository(IpBlacklistMaintainerDB);

        const ipSetParsers = fh.getIpSets().values();

        for await (const ipSetParser of ipSetParsers) {
            let ipListMaintainer;

            const meta = ipSetParser.getMeta();
            const catenum = ipSetParser.getBlacklistCategory();

            // add maintainer infos ------------------------------------------------------------------------------------

            if (meta.maintainer) {
                ipListMaintainer = await ipListMaintainerRepository.findOne({
                    where: {
                        maintainer_name: ipSetParser.getMeta().maintainer
                    }
                });

                if (!ipListMaintainer) {
                    const nIpListMaintainer = new IpListMaintainerDB();

                    nIpListMaintainer.maintainer_name = meta.maintainer!;
                    nIpListMaintainer.maintainer_url = meta.maintainer_url ? meta.maintainer_url : '';
                    nIpListMaintainer.list_source_url = meta.list_source_url ? meta.list_source_url : '';

                    ipListMaintainer = await DBHelper.getDataSource().manager.save(nIpListMaintainer);
                }
            }

            // add ips -------------------------------------------------------------------------------------------------

            for await (const ipSet of ipSetParser.getIps()) {
                let ipBlacklistEntry = await ipBlacklistRepository.findOne({
                    where: {
                        ip: ipSet.ip
                    }
                });

                if (!ipBlacklistEntry) {
                    const blackEntry = new IpBlacklistDB();
                    blackEntry.ip = ipSet.ip;
                    blackEntry.is_imported = true;
                    blackEntry.disable = false;

                    ipBlacklistEntry = await DBHelper.getDataSource().manager.save(blackEntry);
                }

                if (ipBlacklistEntry) {

                    // check have category ---------------------------------------------------------------------------------

                    if (catenum) {
                        const blackCate = await ipBlacklistCategoryRepository.findOne({
                            where: {
                                ip_id: ipBlacklistEntry.id,
                                cat_num: catenum
                            }
                        });

                        if (!blackCate) {
                            const nBlackCate = new IpBlacklistCategoryDB();

                            nBlackCate.ip_id = ipBlacklistEntry.id;
                            nBlackCate.cat_num = catenum;

                            await DBHelper.getDataSource().manager.save(nBlackCate);
                        }
                    }

                    // link maintainer -------------------------------------------------------------------------------------

                    if (ipListMaintainer) {
                        const blackMaintainer = await ipBlacklistMaintainerRepository.findOne({
                            where: {
                                ip_id: ipBlacklistEntry.id,
                                ip_maintainer_id: ipListMaintainer.id
                            }
                        });

                        if (!blackMaintainer) {
                            const nBlackMaintainer = new IpBlacklistMaintainerDB();
                            nBlackMaintainer.ip_id = ipBlacklistEntry.id;
                            nBlackMaintainer.ip_maintainer_id = ipListMaintainer.id;

                            await DBHelper.getDataSource().manager.save(nBlackMaintainer);
                        }
                    }

                    // update blacklist entry ------------------------------------------------------------------------------

                    ipBlacklistEntry!.last_update = DateHelper.getCurrentDbTime();

                    await DBHelper.getDataSource().manager.save(ipBlacklistEntry);
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