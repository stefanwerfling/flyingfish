import {DBService} from '../DBService.js';
import {WanLease} from '../Entity/WanLease.js';

/**
 * Service for the WAN DHCP lease table (Pi-router epic, Phase 3). Effectively a
 * singleton per node — {@link WanLeaseService.get} returns the single row.
 */
export class WanLeaseService extends DBService<WanLease> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'wan_lease';

    /**
     * getInstance
     * @returns {WanLeaseService}
     */
    public static getInstance(): WanLeaseService {
        return DBService.getSingleInstance(WanLeaseService, WanLease, WanLeaseService.REGISTER_NAME);
    }

    /**
     * The node's single WAN lease row, or null if none has been reported yet.
     * @returns {WanLease | null}
     */
    public async get(): Promise<WanLease | null> {
        const rows = await this._repository.find({order: {id: 'ASC'}, take: 1});

        return rows[0] ?? null;
    }

}