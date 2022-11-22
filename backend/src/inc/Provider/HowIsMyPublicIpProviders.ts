import {IHowIsMyPublicIp} from './IHowIsMyPublicIp.js';
import {Ipify} from './Ipify/Ipify.js';

/**
 * HowIsMyPublicIpProviders
 */
export class HowIsMyPublicIpProviders {

    /**
     * getProvider
     * @param name
     */
    public static getProvider(name: string): IHowIsMyPublicIp|null {
        switch (name) {
            case Ipify.getName():
                return new Ipify();
        }

        return null;
    }

}