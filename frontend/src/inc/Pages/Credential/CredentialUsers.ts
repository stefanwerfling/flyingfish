import {Credential} from 'flyingfish_schemas';
import {BasePage} from '../BasePage';

export class CredentialUsers extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'credential_users';

    /**
     * Credential
     * @protected
     */
    protected _credential: Credential;

    /**
     * constructor
     */
    public constructor(credential: Credential) {
        super();

        this._credential = credential;

        this.setTitle(`Credential User-List: ${this._credential.name}`);
    }

}