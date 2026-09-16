import {DBService} from '../DBService.js';
import {NatPolicy} from '../Entity/NatPolicy.js';

/**
 * Service for the NAT/routing policy table (Pi-router epic). Effectively a singleton
 * per node — {@link NatPolicyService.get} returns the single row (or null).
 */
export class NatPolicyService extends DBService<NatPolicy> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'nat_policy';

    /**
     * getInstance
     * @returns {NatPolicyService}
     */
    public static getInstance(): NatPolicyService {
        return DBService.getSingleInstance(NatPolicyService, NatPolicy, NatPolicyService.REGISTER_NAME);
    }

    /**
     * The node's single NAT policy row, or null if none is configured yet.
     * @returns {NatPolicy | null}
     */
    public async get(): Promise<NatPolicy | null> {
        const rows = await this._repository.find({order: {id: 'ASC'}, take: 1});

        return rows[0] ?? null;
    }

}