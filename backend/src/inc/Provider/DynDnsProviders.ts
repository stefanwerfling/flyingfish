import {IDynDns} from './IDynDns';
import {Selfhost} from './Selfhost/Selfhost';

/**
 * DynDnsProviders
 */
export class DynDnsProviders {

    /**
     * getProvider
     * @param name
     */
    public static getProvider(name: string): IDynDns|null {
        switch (name) {
            case Selfhost.getName():
                return new Selfhost();
        }

        return null;
    }

}