import {DateHelper, Logger, ServiceJobAbstract} from 'figtree';
import {
    IpBlacklistCategoryDB,
    IpBlacklistCategoryServiceDB,
    IpBlacklistDB, IpBlacklistMaintainerDB, IpBlacklistMaintainerServiceDB,
    IpBlacklistServiceDB, IpListMaintainerDB, IpListMaintainerServiceDB
} from 'flyingfish_core';
import {Firehol} from '../../inc/Provider/Firehol/Firehol.js';
import {Settings as GlobalSettings} from '../../inc/Settings/Settings.js';

/**
 * BlacklistService
 *
 * Imports the FireHOL IP block lists into the blacklist tables (maintainers,
 * categories, entries) at most once every 24h. Migrated onto figtree's
 * `ServiceJobAbstract`: the framework now owns the cron scheduling, tick
 * timing, error handling, health and restart, replacing the former
 * hand-rolled `node-schedule` job wrapped in a bespoke singleton.
 *
 * Registered by `FlyingFishBackend` with a dependency on the `mariadb` service
 * so the scheduler only starts once the database is up.
 */
export class BlacklistService extends ServiceJobAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'blacklist';

    /**
     * Constructor.
     */
    public constructor() {
        super(BlacklistService.NAME, [ 'mariadb' ]);
        this._cron = '1 1 * * *';
    }

    /**
     * Import the FireHOL block lists, throttled to once per 24h via the
     * `BLACKLIST_IMPORTER_LASTUPDATE` setting. No-op when the importer is
     * disabled in the global settings.
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
            `${DateHelper.getCurrentTime()}`
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

                    ipBlacklistEntry = await IpBlacklistServiceDB.getInstance().save(blackEntry);
                }

                if (ipBlacklistEntry) {

                    // check have category -----------------------------------------------------------------------------

                    if (catenum) {
                        const blackCate = await IpBlacklistCategoryServiceDB.getInstance().findByIpAndCatnum(ipBlacklistEntry.id, catenum);

                        if (!blackCate) {
                            const nBlackCate = new IpBlacklistCategoryDB();

                            nBlackCate.ip_id = ipBlacklistEntry.id;
                            nBlackCate.cat_num = catenum;

                            await IpBlacklistCategoryServiceDB.getInstance().save(nBlackCate);
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

                    ipBlacklistEntry!.last_update = DateHelper.getCurrentTime();

                    await IpBlacklistServiceDB.getInstance().save(ipBlacklistEntry);
                }
            }
        }
    }

    /**
     * Start the service. Runs one immediate pass (mirroring the former
     * hand-rolled `start()`) before handing the cron schedule to the framework.
     */
    public override async start(): Promise<void> {
        await super.start();
        await this.update();
    }

    /**
     * Scheduled execution (invoked by the cron tick).
     * @protected
     */
    protected override async _execute(): Promise<void> {
        await this.update();
    }

}