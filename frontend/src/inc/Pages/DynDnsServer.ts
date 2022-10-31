import {BasePage} from './BasePage';

/**
 * DynDnsServer
 */
export class DynDnsServer extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'dyndnsserver';

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('DynDns-Server');
    }

}