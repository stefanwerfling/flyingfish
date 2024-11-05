import {IDynDnsClient} from 'flyingfish_core';
import {NoIp} from './NoIp/NoIp.js';
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
     * Return the provider by name
     * @param {string} name
     * @returns {IDynDnsClient|null}
     */
    public static getProvider(name: string): IDynDnsClient|null {
        switch (name) {
            case Selfhost.getName():
                return new Selfhost();

            case NoIp.getName():
                return new NoIp();
        }

        return null;
    }

    /**
     * Return all providers
     * @returns {DynDnsProvider[]}
     */
    public static getProviders(): DynDnsProvider[] {
        const list: DynDnsProvider[] = [];

        list.push({
            name: Selfhost.getName(),
            title: Selfhost.getTitle()
        });

        list.push({
            name: NoIp.getName(),
            title: NoIp.getTitle()
        });

        return list;
    }

}