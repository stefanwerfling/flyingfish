import {Job, scheduleJob} from 'node-schedule';
import {HowIsMyPublicIpProviders} from '../Provider/HowIsMyPublicIpProviders';
import {DynDnsService} from './DynDnsService';

/**
 * HowIsMyPublicIpService
 */
export class HowIsMyPublicIpService {

    /**
     * instance
     * @private
     */
    private static _instance: HowIsMyPublicIpService|null = null;

    /**
     * getInstance
     */
    public static getInstance(): HowIsMyPublicIpService {
        if (HowIsMyPublicIpService._instance === null) {
            HowIsMyPublicIpService._instance = new HowIsMyPublicIpService();
        }

        return HowIsMyPublicIpService._instance;
    }

    /**
     * scheduler job
     * @protected
     */
    protected _scheduler: Job|null = null;

    /**
     * current ip
     * @protected
     */
    protected _currentIp: string|null = null;

    /**
     * start
     */
    public async start(): Promise<void> {
        this._scheduler = scheduleJob('*/1 * * * *', async() => {
            const provider = HowIsMyPublicIpProviders.getProvider('ipify');

            if (provider) {
                if (this._currentIp === null) {
                    this._currentIp = await provider.get();

                    console.log(`Set my current public ip(${this._currentIp})`);
                } else {
                    const ip = await provider.get();

                    if (this._currentIp !== ip) {
                        console.log(`Public ip change old(${this._currentIp}) new(${ip})`);

                        this._currentIp = ip;
                        DynDnsService.getInstance().updateDns();
                    }
                }
            }
        });
    }

}