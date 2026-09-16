import {ClusterStateEntry} from 'flyingfish_schemas';
import os from 'os';

/**
 * Produces the resources this Hub publishes into the cluster gossip (Cluster/Mesh
 * epic 9.5.12 phase 2b): its local clusterserver pulls these, owns them (namespacing
 * the keys by its nodeUid) and gossips them so every node sees a federated view. Keys
 * are Hub-relative. For now it publishes only a hub descriptor; later phases add the
 * globally-shared resources (domains first). Kept as its own provider so that
 * extension is a one-place change.
 */
export class ClusterLocalStateProvider {

    /**
     * This Hub's publishable state entries.
     */
    public entries(): ClusterStateEntry[] {
        return [
            {key: 'hub', value: {host: os.hostname()}}
        ];
    }

}