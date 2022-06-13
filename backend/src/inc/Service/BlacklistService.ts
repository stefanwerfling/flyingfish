import {Job, scheduleJob} from 'node-schedule';

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