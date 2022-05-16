import {Job, scheduleJob} from 'node-schedule';
import {DynDnsClient as DynDnsClientDB} from '../Db/MariaDb/Entity/DynDnsClient';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {DynDnsProviders} from '../Provider/DynDnsProviders';

/**
 * DynDnsService
 */
export class DynDnsService {

    /**
     * instance
     * @private
     */
    private static _instance: DynDnsService|null = null;

    /**
     * getInstance
     */
    public static getInstance(): DynDnsService {
        if (DynDnsService._instance === null) {
            DynDnsService._instance = new DynDnsService();
        }

        return DynDnsService._instance;
    }

    /**
     * scheduler job
     * @protected
     */
    protected _scheduler: Job|null = null;

    /**
     * start
     */
    public async start(): Promise<void> {
        const dyndnclientRepository = MariaDbHelper.getRepository(DynDnsClientDB);

        this._scheduler = scheduleJob('1 */1 * * *', async() => {
            const clients = await dyndnclientRepository.find();

            for (const client of clients) {
                const provider = DynDnsProviders.getProvider(client.provider);

                if (await provider?.update(client.username, client.password, '')) {
                    console.log(`Domain ip update by provider(${provider?.getName()})`);
                } else {
                    console.log(`Domain ip update faild by provider(${provider?.getName()})`);
                }
            }
        });
    }

}