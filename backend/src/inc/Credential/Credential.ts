import {Credential as CredentialDB} from '../Db/MariaDb/Entity/Credential';
import {NginxLocation as NginxLocationDB} from '../Db/MariaDb/Entity/NginxLocation';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {CredentialProvider} from './CredentialProvider';
import {ICredentialAuthBasic} from './ICredential';

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
        const locationRepository = MariaDbHelper.getRepository(NginxLocationDB);
        const credentialRepository = MariaDbHelper.getRepository(CredentialDB);

        const location = await locationRepository.findOne({
            where: {
                id: locationId
            }
        });

        if (location) {
            const credentials = await credentialRepository.find({
                where: {
                    location_id: location.id
                },
                order: {
                    position: 'ASC'
                }
            });

            for (const credential of credentials) {
                const credentialObj = CredentialProvider.getCredential(credential.provider, credential);

                if (credentialObj) {
                    const credentialAuthBasic = credentialObj as ICredentialAuthBasic;

                    const resulte = await credentialAuthBasic.authBasic(auth.username, auth.password);

                    if (resulte) {
                        return true;
                    }
                }
            }
        } else {
            console.log(`Location not found: ${locationId}`);
        }

        return false;
    }

}