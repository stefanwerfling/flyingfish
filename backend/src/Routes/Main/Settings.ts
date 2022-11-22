import {Get, JsonController, Session} from 'routing-controllers-extended';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';

/**
 * SettingsList
 */
export type SettingsList = {
    nginx: {
        worker_connections: string;
        resolver: string;
    };
};

/**
 * SettingsResponse
 */
export type SettingsResponse = DefaultReturn & {
    list?: SettingsList;
};

/**
 * Settings
 */
@JsonController()
export class Settings {

    /**
     * getList
     * @param session
     */
    @Get('/json/settings/list')
    public async getList(@Session() session: any): Promise<SettingsResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {

        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}