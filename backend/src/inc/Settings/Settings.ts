import {SettingsDB, SettingServiceDB} from 'flyingfish_core';

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
        const setting = await SettingServiceDB.getInstance().findByName(name);

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
        let setting = await SettingServiceDB.getInstance().findByName(name);

        if (!setting) {
            setting = new SettingsDB();
            setting.name = name;
        }

        setting.value = value;

        await await SettingServiceDB.getInstance().save(setting);
    }

}