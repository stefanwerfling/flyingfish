import {CredentialLocationServiceDB, CredentialServiceDB, NginxLocationServiceDB} from 'flyingfish_core';
import {Logger} from 'figtree';
import {CredentialSchemaBasic} from 'flyingfish_schemas';
import {CredentialDatabase} from './CredentialDatabase.js';

/**
 * Provider name of the built-in database credential check
 * (backend/src/inc/Provider/CredentialProvider/Database/CredentialProvider.ts#NAME).
 * Kept as a literal here rather than a shared export: it is the one provider
 * this package can check without the full plugin system (see class doc).
 */
const INTERN_DATABASE_PROVIDER_NAME = 'intern_database';

/**
 * Credential
 *
 * njs `auth_basic` credential check for the extracted nginx container. Only
 * resolves the built-in database provider directly (no `PluginManager` here,
 * unlike the backend's Credential.authBasic) — external credential-provider
 * plugins are a backend-only concept until the plugin system itself becomes
 * per-container (roadmap 9.9.2). A location using a plugin provider fails
 * closed (denied + warning) rather than silently granting access.
 */
export class Credential {

    /**
     * authBasic
     * @param {string} locationId
     * @param {CredentialSchemaBasic} auth
     * @returns {Promise<boolean>}
     */
    public static async authBasic(locationId: string, auth: CredentialSchemaBasic): Promise<boolean> {
        const nLocationId = parseInt(locationId, 10) || 0;

        const location = await NginxLocationServiceDB.getInstance().findOne(nLocationId);

        if (!location) {
            Logger.getLogger().error('Credential::authBasic: Location not found: %s', locationId);

            return false;
        }

        Logger.getLogger().silly('Credential::authBasic: location found by id: %d', location.id);

        const credLocations = await CredentialLocationServiceDB.getInstance().getListByLocation(location.id);

        const credentials = await CredentialServiceDB.getInstance().findByIds(
            credLocations.map(value => value.credential_id)
        );

        Logger.getLogger().silly('Credential::authBasic: Found credentials: %d', credentials.length);

        for await (const credential of credentials) {
            if (credential.provider !== INTERN_DATABASE_PROVIDER_NAME) {
                Logger.getLogger().warn(
                    'Credential::authBasic: credential(%d) uses provider "%s", which is not available in the ' +
                    'extracted nginx container (plugin providers are backend-only, roadmap 9.9.2) — denying.',
                    credential.id,
                    credential.provider
                );

                continue;
            }

            if (await CredentialDatabase.authBasic(credential.id, auth.username, auth.password)) {
                return true;
            }
        }

        return false;
    }

}