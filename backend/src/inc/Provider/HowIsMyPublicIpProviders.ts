import {IHowIsMyPublicIp} from './IHowIsMyPublicIp';
import {Ipify} from './Ipify/Ipify';

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