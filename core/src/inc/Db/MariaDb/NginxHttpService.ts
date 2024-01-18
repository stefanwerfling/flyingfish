import {UpdateResult} from 'typeorm';
import {DateHelper} from '../../Utils/DateHelper.js';
import {DBService} from './DBService.js';
import {NginxHttp} from './Entity/NginxHttp.js';

/**
 * Nginx http service object.
 */
export class NginxHttpService extends DBService<NginxHttp> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'nginx_http';

    /**
     * Return an intance from nginx http service.
     * @returns {NginxHttpService}
     */
    public static getInstance(): NginxHttpService {
        return DBService.getSingleInstance(
            NginxHttpService,
            NginxHttp,
            NginxHttpService.REGISTER_NAME
        );
    }

    /**
     * Find all nginx http entries by listen ID.
     * @param {number} listenId - ID from listen.
     * @returns {NginxHttp[]}
     */
    public async findAllByListen(listenId: number): Promise<NginxHttp[]> {
        return this._repository.find({
            where: {
                listen_id: listenId
            }
        });
    }

    /**
     * Count all entries by domain ID.
     * @param {number} domainId
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
     * Find all entries by domain.
     * @param {number} domainId
     * @returns {NginxHttp[]}
     */
    public async findAllByDomain(domainId: number): Promise<NginxHttp[]> {
        return this._repository.find({
            where: {
                domain_id: domainId
            }
        });
    }

    /**
     * Update the last certification request.
     * @param {number} id
     * @param {number} createAttempts
     * @returns {UpdateResult}
     */
    public async updateLastCertReq(id: number, createAttempts: number = 0): Promise<UpdateResult> {
        return await this._repository
        .createQueryBuilder()
        .update()
        .set({
            cert_create_attempts: createAttempts,
            cert_last_request: DateHelper.getCurrentDbTime()
        })
        .where('id = :id', {id: id})
        .execute();
    }

    /**
     * Find by listen ID and domain ID.
     * @param {number} listenId
     * @param {number} domainId
     * @returns {NginxHttp|null}
     */
    public async findBy(listenId: number, domainId: number): Promise<NginxHttp|null> {
        return this._repository.findOne({
            where: {
                listen_id: listenId,
                domain_id: domainId
            }
        });
    }

    /**
     * Find all Http entries by ssl enable = true
     * @returns {NginxHttp[]}
     */
    public async findAllBySslEnable(): Promise<NginxHttp[]> {
        return this._repository.find({
            where: {
                ssl_enable: true
            }
        });
    }

    /**
     * Count all entries with listen ID.
     * @param {number} listenId
     * @returns {number}
     */
    public async countByListen(listenId: number): Promise<number> {
        return this._repository.count({
            where: {
                listen_id: listenId
            }
        });
    }

}