import {Get, JsonController, Session} from 'routing-controllers';
import {NginxService} from '../../inc/Service/NginxService';

/**
 * Nginx
 */
@JsonController()
export class Nginx {

    /**
     * reload
     * @param session
     */
    @Get('/json/nginx/reload')
    public async reload(@Session() session: any): Promise<boolean> {
        if ((session.user !== undefined) && session.user.isLogin) {
            await NginxService.getInstance().reload();

            return true;
        }

        return false;
    }

}