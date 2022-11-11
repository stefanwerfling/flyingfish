import got from 'got';
import {Logger} from '../../Logger/Logger';
import {NginxStatus, NginxStatusResult} from '../../Nginx/NginxStatus';
import {NginxService} from '../../Service/NginxService';

/**
 * NginxHandler
 */
export class NginxHandler {

    /**
     * getStatus
     * @param listenPort
     */
    public async getStatus(listenPort: number): Promise<NginxStatusResult|null> {
        try {
            const response = await got({
                url: `http://127.0.0.1:${listenPort}${NginxService.LOCATION_STATUS}`
            });

            if (response.body) {
                return NginxStatus.parse(response.body);
            }
        } catch (e) {
            Logger.getLogger().error('NginxHandler::getStatus:');
            Logger.getLogger().error(e);
        }

        return null;
    }

}