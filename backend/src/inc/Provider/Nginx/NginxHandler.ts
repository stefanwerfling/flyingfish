import {Logger} from 'flyingfish_core';
import got from 'got';
import {NginxStatus, NginxStatusResult} from '../../Nginx/NginxStatus.js';
import {NginxService} from '../../../Service/NginxService.js';

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
            Logger.getLogger().error('NginxHandler::getStatus:', e);
        }

        return null;
    }

}