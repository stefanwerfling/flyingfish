import {SslProvider} from 'flyingfish_schemas';
import {ISsl} from './ISsl.js';
import {Certbot} from './Letsencrypt/Certbot.js';

/**
 * SslProviders
 */
export class SslProviders {

    /**
     * getProvider
     * @param name
     */
    public static getProvider(name: string): ISsl|null {
        switch (name) {
            case Certbot.getName():
                return new Certbot();
        }

        return null;
    }

    /**
     * getProviders
     */
    public static getProviders(): SslProvider[] {
        const list: SslProvider[] = [];

        list.push({
            name: Certbot.getName(),
            title: Certbot.getTitle()
        });

        return list;
    }

}