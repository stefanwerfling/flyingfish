import {DBHelper} from 'flyingfish_core';
import {Settings as SettingsDB} from '../Db/MariaDb/Entity/Settings.js';

/**
 * Settings
 */
export class Settings {

    // NGINX -----------------------------------------------------------------------------------------------------------

    public static readonly NGINX_WORKER_CONNECTIONS = 'nginx_worker_connections';
    public static readonly NGINX_WORKER_CONNECTIONS_DEFAULT = '4096';

    public static readonly NGINX_RESOLVER = 'nginx_resolver';
    public static readonly NGINX_RESOLVER_DEFAULT = '8.8.8.8';

    public static readonly BLACKLIST_IMPORTER = 'blacklist_importer';
    public static readonly BLACKLIST_IMPORTER_DEFAULT = '';
    public static readonly BLACKLIST_IMPORTER_LASTUPDATE = 'blacklist_importer_lastupdate';

    // BLACKLIST -------------------------------------------------------------------------------------------------------

    public static readonly BLACKLIST_IPLOCATE = 'blacklist_iplocate';
    public static readonly BLACKLIST_IPLOCATE_DEFAULT = '';

    /**
     * getSetting
     * @param name
     * @param vdefault
     */
    public static async getSetting(name: string, vdefault: string): Promise<string> {
        const settingsRepository = DBHelper.getRepository(SettingsDB);

        const setting = await settingsRepository.findOne({
            where: {
                name: name
            }
        });

        if (setting) {
            return setting.value;
        }

        return vdefault;
    }

    /**
     * setSetting
     * @param name
     * @param value
     */
    public static async setSetting(name: string, value: string): Promise<void> {
        const settingsRepository = DBHelper.getRepository(SettingsDB);

        let setting = await settingsRepository.findOne({
            where: {
                name: name
            }
        });

        if (!setting) {
            setting = new SettingsDB();
            setting.name = name;
        }

        setting.value = value;

        await DBHelper.getDataSource().manager.save(setting);
    }

}