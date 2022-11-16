import {Get, JsonController, Session} from 'routing-controllers';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

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