import {DBService} from '../DBService.js';
import {NetworkInterface} from '../Entity/NetworkInterface.js';

/**
 * Service for the network interface table (Pi-router epic).
 */
export class NetworkInterfaceService extends DBService<NetworkInterface> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'network_interface';

    /**
     * getInstance
     * @returns {NetworkInterfaceService}
     */
    public static getInstance(): NetworkInterfaceService {
        return DBService.getSingleInstance(NetworkInterfaceService, NetworkInterface, NetworkInterfaceService.REGISTER_NAME);
    }

    /**
     * Find an interface by its (stable) MAC address.
     * @param {string} mac
     * @returns {NetworkInterface | null}
     */
    public async findByMac(mac: string): Promise<NetworkInterface | null> {
        return this._repository.findOne({where: {mac_address: mac}});
    }

    /**
     * The interfaces holding a given router role (`wan` / `lan`).
     * @param {string} role
     * @returns {NetworkInterface[]}
     */
    public async findByRole(role: string): Promise<NetworkInterface[]> {
        return this._repository.find({where: {role: role}});
    }

}