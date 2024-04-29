import {CredentialLocationServiceDB, CredentialServiceDB, Logger, NginxLocationServiceDB} from 'flyingfish_core';
import {CredentialSchemaBasic} from 'flyingfish_schemas';
import {CredentialProvider} from './CredentialProvider.js';
import {ICredentialAuthBasic} from './ICredential.js';

/**
 * Credential
 */
export class Credential {

    /**
     * authBasic
     * @param locationId
     * @param auth
     */
    public static async authBasic(locationId: string, auth: CredentialSchemaBasic): Promise<boolean> {
        const nLocationId = parseInt(locationId, 10) || 0;

        const location = await NginxLocationServiceDB.getInstance().findOne(nLocationId);

        if (location) {
            Logger.getLogger().silly(`Credential::authBasic: location found by id: ${location.id}`);

            const credLocactions = await CredentialLocationServiceDB.getInstance().getListByLocation(location.id);

            const credentials = await CredentialServiceDB.getInstance().findByIds(
                credLocactions.map(value => {
                    return value.credential_id;
                })
            );

            Logger.getLogger().silly(`Credential::authBasic: Found credentials: ${credentials.length}`);

            for await (const credential of credentials) {
                const credentialObj = CredentialProvider.getCredential(credential.provider, credential);

                if (credentialObj) {
                    Logger.getLogger().silly(`Credential::authBasic: Use credential object: ${credentialObj}`);

                    const credentialAuthBasic = credentialObj as ICredentialAuthBasic;

                    const result = await credentialAuthBasic.authBasic(auth.username, auth.password);

                    Logger.getLogger().silly(`Credential::authBasic: credential object result: ${result}`);

                    if (result) {
                        return true;
                    }
                }
            }
        } else {
            Logger.getLogger().error(`Credential::authBasic: Location not found: ${locationId}`);
        }

        return false;
    }

}