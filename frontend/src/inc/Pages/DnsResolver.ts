import {BasePage} from './BasePage';

/**
 * DnsResolver
 */
export class DnsResolver extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'dnsresolver';

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Dns-Resolver');
    }

}