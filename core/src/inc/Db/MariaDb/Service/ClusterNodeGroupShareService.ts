import {DBService} from '../DBService.js';
import {ClusterNodeGroupShare} from '../Entity/ClusterNodeGroupShare.js';

/**
 * Service for the cluster node-group sharing rules table (Cluster/Mesh epic 9.5.12.4).
 * CRUD via the DBService base.
 */
export class ClusterNodeGroupShareService extends DBService<ClusterNodeGroupShare> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'cluster_node_group_share';

    /**
     * getInstance
     * @returns {ClusterNodeGroupShareService}
     */
    public static getInstance(): ClusterNodeGroupShareService {
        return DBService.getSingleInstance(ClusterNodeGroupShareService, ClusterNodeGroupShare, ClusterNodeGroupShareService.REGISTER_NAME);
    }

}
