import {ServiceJobAbstract} from 'figtree';
import {NginxListenServiceDB} from 'flyingfish_core';
import {NginxListenCategory, NginxListenTypes} from 'flyingfish_schemas';

/**
 * NginxStatusService
 *
 * First FlyingFish app service migrated onto figtree's `ServiceJobAbstract`.
 * It periodically polls the nginx status listen. The framework now owns the
 * cron scheduling, tick timing, error handling, health and restart — replacing
 * the former hand-rolled `node-schedule` job wrapped in a bespoke singleton.
 *
 * Registered by `FlyingFishBackend` with a dependency on the `mariadb` service
 * so the scheduler only starts once the database is up.
 */
export class NginxStatusService extends ServiceJobAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'nginxstatus';

    /**
     * Constructor.
     */
    public constructor() {
        super(NginxStatusService.NAME, [ 'mariadb' ]);
        this._cron = '*/1 * * * *';
    }

    /**
     * Poll the nginx status listen and update the status.
     */
    public async updateStatus(): Promise<void> {
        const statusListen = await NginxListenServiceDB.getInstance().findByType(
            NginxListenTypes.http,
            NginxListenCategory.status
        );

        if (statusListen) {

            /*
             * const handler = new NginxHandler();
             * const result = await handler.getStatus(statusListen.listen_port);
             * console.log(result);
             */
        }
    }

    /**
     * Scheduled execution (invoked by the cron tick).
     * @protected
     */
    protected override async _execute(): Promise<void> {
        await this.updateStatus();
    }

}