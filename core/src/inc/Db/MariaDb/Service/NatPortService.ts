import {NatStatus} from 'flyingfish_schemas';
import {DateHelper} from '../../../Utils/DateHelper.js';
import {DBService} from '../DBService.js';
import {NatPort} from '../Entity/NatPort.js';

/**
 * Nat port service object.
 */
export class NatPortService extends DBService<NatPort> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'nat_port';

    /**
     * Return an intance from nat port service.
     * @returns {NatPortService}
     */
    public static getInstance(): NatPortService {
        return DBService.getSingleInstance(
            NatPortService,
            NatPort,
            NatPortService.REGISTER_NAME
        );
    }

    /**
     * Update a status from nat port.
     * @param {number} id - ID from nat port.
     * @param {NatStatus} status - Status for update.
     */
    public async updateStatus(id: number, status: NatStatus): Promise<void> {
        await this._repository.createQueryBuilder()
        .update()
        .set({
            last_status: status,
            last_update: DateHelper.getCurrentDbTime()
        })
        .where('id = :id', {id: id})
        .execute();
    }

    /**
     * Rest status by all nat ports.
     */
    public async resetAllStatus(): Promise<void> {
        await this._repository.createQueryBuilder()
        .update()
        .set({
            last_status: NatStatus.inactive,
            last_update: DateHelper.getCurrentDbTime()
        })
        .execute();
    }

    /**
     * Find all nat ports by gateway identifier.
     * @param {number} gatewayIdentifierId - A gateway identifier ID.
     * @returns {NatPort[]}
     */
    public async findAllByGatewayIdentifier(gatewayIdentifierId: number): Promise<NatPort[]> {
        return this._repository.find({
            where: {
                gateway_identifier_id: gatewayIdentifierId
            }
        });
    }

}