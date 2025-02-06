import {DeleteResult} from 'typeorm';
import {DBService} from '../DBService.js';
import {NginxLocation} from '../Entity/NginxLocation.js';
import {CredentialLocationService} from './CredentialLocationService.js';

/**
 * Nginx location service object.
 */
export class NginxLocationService extends DBService<NginxLocation> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'nginx_location';

    /**
     * Return an intance from nginx location service.
     * @returns {NginxLocationService}
     */
    public static getInstance(): NginxLocationService {
        return DBService.getSingleInstance(
            NginxLocationService,
            NginxLocation,
            NginxLocationService.REGISTER_NAME
        );
    }

    /**
     * Find all entries by http id.
     * @param {number} httpId
     * @returns {NginxLocation[]}
     */
    public async findAllByHttp(httpId: number): Promise<NginxLocation[]> {
        return this._repository.find({
            where: {
                http_id: httpId
            }
        });
    }

    /**
     * Remove all entries by http id.
     * @param {number} httpId
     * @returns {DeleteResult}
     */
    public async removeAllByHttp(httpId: number): Promise<DeleteResult> {
        return this._repository.delete({
            http_id: httpId
        });
    }

    /**
     * Count all entries by ssh port out id.
     * @param {number} sshportOutId
     * @returns {number}
     */
    public async countAllBySshPortOut(sshportOutId: number): Promise<number> {
        return this._repository.count({
            where: {
                sshport_out_id: sshportOutId
            }
        });
    }

    /**
     * Remove a row (entry) by ID.
     * @param {number} id - ID from entry.
     * @returns {DeleteResult}
     */
    public override async remove(id: number): Promise<DeleteResult> {
        await CredentialLocationService.getInstance().removeByLoction(id);
        return super.remove(id);
    }

}