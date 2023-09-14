import {DBService} from './DBService.js';
import {Settings} from './Entity/Settings.js';

/**
 * Setting service object.
 */
export class SettingService extends DBService<Settings> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'settings';

    /**
     * Return an intance from settings service.
     * @returns {NatPortService}
     */
    public static getInstance(): SettingService {
        return DBService.getSingleInstance(
            SettingService,
            Settings,
            SettingService.REGISTER_NAME
        );
    }

    /**
     * Find a setting by name.
     * @param {string} name - Setting name.
     * @returns {Settings|null}
     */
    public async findByName(name: string): Promise<Settings|null> {
        return this._repository.findOne({
            where: {
                name: name
            }
        });
    }

}