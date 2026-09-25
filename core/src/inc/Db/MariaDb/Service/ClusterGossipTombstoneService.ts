import {DBService} from '../DBService.js';
import {ClusterGossipTombstone} from '../Entity/ClusterGossipTombstone.js';

/**
 * Service for the cluster gossip tombstone table (Cluster/Mesh epic 9.5.12.8 fix).
 * CRUD via the DBService base.
 */
export class ClusterGossipTombstoneService extends DBService<ClusterGossipTombstone> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'cluster_gossip_tombstone';

    /**
     * getInstance
     * @returns {ClusterGossipTombstoneService}
     */
    public static getInstance(): ClusterGossipTombstoneService {
        return DBService.getSingleInstance(ClusterGossipTombstoneService, ClusterGossipTombstone, ClusterGossipTombstoneService.REGISTER_NAME);
    }

}
