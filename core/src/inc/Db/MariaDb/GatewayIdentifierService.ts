import {DBService} from './DBService.js';
import {GatewayIdentifier} from './Entity/GatewayIdentifier.js';

/**
 * Gateway identifier service object.
 */
export class GatewayIdentifierService extends DBService<GatewayIdentifier> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'gateway_identifier';

    /**
     * Return an intance from gateway identifier server.
     * @returns {GatewayIdentifierService}
     */
    public static getInstance(): GatewayIdentifierService {
        return DBService.getSingleInstance(
            GatewayIdentifierService,
            GatewayIdentifier,
            GatewayIdentifierService.REGISTER_NAME
        );
    }

    /**
     * Find a gateway identifier by mac.
     * @param {string} mac - Mac address for a gateway identifier.
     * @returns {GatewayIdentifier|null}
     */
    public async findByMac(mac: string): Promise<GatewayIdentifier|null> {
        return this._repository.findOne({
            where: {
                mac_address: mac
            }
        });
    }

}