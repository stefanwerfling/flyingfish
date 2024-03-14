import {DBService} from '../DBService.js';
import {SshPort} from '../Entity/SshPort.js';

/**
 * Ssh port service object.
 */
export class SshPortService extends DBService<SshPort> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'ssh_port';

    /**
     * Return an intance from ssh port service.
     * @returns {SshPortService}
     */
    public static getInstance(): SshPortService {
        return DBService.getSingleInstance(
            SshPortService,
            SshPort,
            SshPortService.REGISTER_NAME
        );
    }

    /**
     * Find an Ssh port by port number.
     * @param {number} port
     * @returns {SshPort|null}
     */
    public async findByPort(port: number): Promise<SshPort|null> {
        return this._repository.findOne({
            where: {
                port: port
            }
        });
    }

}