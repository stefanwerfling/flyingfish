import {Logger} from 'figtree';
import got from 'got';
import {NginxStatus, NginxStatusResult} from '../../Nginx/NginxStatus.js';
import {NginxConfigBuilder} from '../../Nginx/NginxConfigBuilder.js';

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
                url: `http://127.0.0.1:${listenPort}${NginxConfigBuilder.LOCATION_STATUS}`
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