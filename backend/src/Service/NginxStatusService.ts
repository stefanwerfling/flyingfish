import {NginxListenServiceDB} from 'flyingfish_core';
import {NginxListenCategory, NginxListenTypes} from 'flyingfish_schemas';
import {Job, scheduleJob} from 'node-schedule';

/**
 * NginxStatusService
 */
export class NginxStatusService {

    /**
     * instance
     * @private
     */
    private static _instance: NginxStatusService|null = null;

    /**
     * getInstance
     */
    public static getInstance(): NginxStatusService {
        if (NginxStatusService._instance === null) {
            NginxStatusService._instance = new NginxStatusService();
        }

        return NginxStatusService._instance;
    }

    /**
     * scheduler job
     * @protected
     */
    protected _scheduler: Job|null = null;

    /**
     * updateDns
     * @protected
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
     * start
     */
    public async start(): Promise<void> {
        await this.updateStatus();

        this._scheduler = scheduleJob('*/1 * * * *', async() => {
            await this.updateStatus();
        });
    }

}