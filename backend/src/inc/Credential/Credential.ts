import {Logger} from 'flyingfish_core';
import {DBHelper} from '../Db/MariaDb/DBHelper.js';
import {Credential as CredentialDB} from '../Db/MariaDb/Entity/Credential.js';
import {NginxLocation as NginxLocationDB} from '../Db/MariaDb/Entity/NginxLocation.js';
import {CredentialProvider} from './CredentialProvider.js';
import {ICredentialAuthBasic} from './ICredential.js';

/**
 * CredentialSchemes
 */
export enum CredentialSchemes {
    Basic,
    Digest
}

/**
 * CredentialSchemeBasic
 */
export type CredentialSchemeBasic = {
    username: string;
    password: string;
};

/**
 * Credential
 */
export class Credential {

    /**
     * authBasic
     * @param locationId
     * @param auth
     */
    public static async authBasic(locationId: string, auth: CredentialSchemeBasic): Promise<boolean> {
        const locationRepository = DBHelper.getRepository(NginxLocationDB);
        const credentialRepository = DBHelper.getRepository(CredentialDB);

        const nLocationId = parseInt(locationId, 10) || 0;

        const location = await locationRepository.findOne({
            where: {
                id: nLocationId
            }
        });

        if (location) {
            Logger.getLogger().silly(`Credential::authBasic: location found by id: ${locationId}`);

            const credentials = await credentialRepository.find({
                where: {
                    location_id: location.id
                },
                order: {
                    position: 'ASC'
                }
            });

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