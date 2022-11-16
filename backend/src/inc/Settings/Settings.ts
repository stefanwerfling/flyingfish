import {Settings as SettingsDB} from '../Db/MariaDb/Entity/Settings';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';

/**
 * Settings
 */
export class Settings {

    // NGINX -----------------------------------------------------------------------------------------------------------

    public static readonly NGINX_WORKER_CONNECTIONS = 'nginx_worker_connections';
    public static readonly NGINX_WORKER_CONNECTIONS_DEFAULT = '4096';

    public static readonly NGINX_RESOLVER = 'nginx_resolver';
    public static readonly NGINX_RESOLVER_DEFAULT = '8.8.8.8';

    /**
     * getSetting
     * @param name
     * @param vdefault
     */
    public static async getSetting(name: string, vdefault: string): Promise<string> {
        const settingsRepository = MariaDbHelper.getRepository(SettingsDB);

        const setting = await settingsRepository.findOne({
            where: {
                name
            }
        });

        if (setting) {
            return setting.value;
        }

        return vdefault;
    }

}