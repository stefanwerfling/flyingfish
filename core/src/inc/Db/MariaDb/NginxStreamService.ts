import {NginxStreamDestinationType, NginxStreamSshR} from 'flyingfish_schemas';
import {Not} from 'typeorm';
import {DBService} from './DBService.js';
import {NginxStream} from './Entity/NginxStream.js';

/**
 * Nginx stream service object.
 */
export class NginxStreamService extends DBService<NginxStream> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'nginx_stream';

    /**
     * Return an intance from nginx stream service.
     * @returns {NginxStreamService}
     */
    public static getInstance(): NginxStreamService {
        return DBService.getSingleInstance(
            NginxStreamService,
            NginxStream,
            NginxStreamService.REGISTER_NAME
        );
    }

    /**
     * Return a count by destination type, sshR Type and ssh port ID.
     * @param {NginxStreamDestinationType} destinationType
     * @param {NginxStreamSshR} sshRType
     * @param {number} sshPortId
     * @returns {number}
     */
    public async countStreamOut(destinationType: NginxStreamDestinationType, sshRType: NginxStreamSshR, sshPortId: number): Promise<number> {
        return this._repository.count({
            where: {
                destination_type: destinationType,
                ssh_r_type: sshRType,
                sshport_id: sshPortId
            }
        });
    }

    /**
     * Count streams by listen ID and domain ID and not by own stream ID.
     * @param {number} listenId - Listen ID form listens table.
     * @param {number} domainId - Domain ID form domain table.
     * @param {number} notId - Own stream ID, not with count.
     * @returns {number}
     */
    public async countStreamBy(listenId: number, domainId: number, notId: number): Promise<number> {
        return this._repository.countBy({
            listen_id: listenId,
            domain_id: domainId,
            id: Not(notId)
        });
    }

    /**
     * Count all streams by listen ID.
     * @param {number} listenId - Listen ID form listen table.
     * @returns {number}
     */
    public async countByListen(listenId: number): Promise<number> {
        return this._repository.count({
            where: {
                listen_id: listenId
            }
        });
    }

    /**
     * Find all streams by listen ID.
     * @param {number} listenId - Listen ID form listen table.
     * @returns {NginxStream[]}
     */
    public async findAllByListen(listenId: number): Promise<NginxStream[]> {
        return this._repository.find({
            where: {
                listen_id: listenId
            }
        });
    }

    /**
     * Count all streams by domain ID.
     * @param {number} domainId - Domain ID form domain table.
     * @returns {number}
     */
    public async countByDomain(domainId: number): Promise<number> {
        return this._repository.count({
            where: {
                domain_id: domainId
            }
        });
    }

    /**
     * Find all streams by domain ID.
     * @param {number} domainId - Domain ID form domain table.
     * @returns {NginxStream[]}
     */
    public async findAllByDomain(domainId: number): Promise<NginxStream[]> {
        return this._repository.find({
            where: {
                domain_id: domainId
            }
        });
    }

}