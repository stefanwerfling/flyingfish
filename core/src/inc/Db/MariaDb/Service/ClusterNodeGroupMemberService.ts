import {DBService} from '../DBService.js';
import {ClusterNodeGroupMember} from '../Entity/ClusterNodeGroupMember.js';

/**
 * Service for the cluster node-group membership table (Cluster/Mesh epic 9.5.12.3).
 * CRUD via the DBService base.
 */
export class ClusterNodeGroupMemberService extends DBService<ClusterNodeGroupMember> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'cluster_node_group_member';

    /**
     * getInstance
     * @returns {ClusterNodeGroupMemberService}
     */
    public static getInstance(): ClusterNodeGroupMemberService {
        return DBService.getSingleInstance(ClusterNodeGroupMemberService, ClusterNodeGroupMember, ClusterNodeGroupMemberService.REGISTER_NAME);
    }

}