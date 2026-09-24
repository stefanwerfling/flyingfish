import {DBService} from '../DBService.js';
import {ClusterNodeGroup} from '../Entity/ClusterNodeGroup.js';

/**
 * Service for the cluster node-group table (Cluster/Mesh epic 9.5.12.3). CRUD via the
 * DBService base.
 */
export class ClusterNodeGroupService extends DBService<ClusterNodeGroup> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'cluster_node_group';

    /**
     * getInstance
     * @returns {ClusterNodeGroupService}
     */
    public static getInstance(): ClusterNodeGroupService {
        return DBService.getSingleInstance(ClusterNodeGroupService, ClusterNodeGroup, ClusterNodeGroupService.REGISTER_NAME);
    }

}