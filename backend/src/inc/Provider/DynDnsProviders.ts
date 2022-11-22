import {IDynDns} from './IDynDns.js';
import {Selfhost} from './Selfhost/Selfhost.js';

/**
 * DynDnsProvider
 */
export type DynDnsProvider = {
    name: string;
    title: string;
};

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

    /**
     * getProviders
     */
    public static getProviders(): DynDnsProvider[] {
        const list: DynDnsProvider[] = [];

        list.push({
            name: Selfhost.getName(),
            title: Selfhost.getTitle()
        });

        return list;
    }

}