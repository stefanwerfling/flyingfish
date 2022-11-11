import {BasePage} from './BasePage';

/**
 * Settings
 */
export class Settings extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'settings';

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Settings');


    }

}