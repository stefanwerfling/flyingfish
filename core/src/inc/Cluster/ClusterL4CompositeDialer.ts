import {ClusterL4ClientInfo, ClusterL4Proto, ClusterL4Target} from './ClusterL4Frame.js';
import {IClusterL4Dialer, IClusterL4Stream} from './ClusterL4Stream.js';

/**
 * Routes an egress dial to the right transport dialer by the target's proto
 * (Cluster/Mesh epic 9.5.2): UDP targets go to the UDP dialer, everything else to
 * the TCP dialer. This is the dialer a datapath node gives its
 * {@link ClusterL4Tunnel} so one tunnel coordinator serves both TCP and UDP routes.
 */
export class ClusterL4CompositeDialer implements IClusterL4Dialer {

    private readonly _tcp: IClusterL4Dialer;

    private readonly _udp: IClusterL4Dialer;

    /**
     * @param tcp - the TCP dialer
     * @param udp - the UDP dialer
     */
    public constructor(tcp: IClusterL4Dialer, udp: IClusterL4Dialer) {
        this._tcp = tcp;
        this._udp = udp;
    }

    /**
     * @inheritDoc
     */
    public async dial(target: ClusterL4Target, clientInfo?: ClusterL4ClientInfo): Promise<IClusterL4Stream> {
        if (target.proto === ClusterL4Proto.Udp) {
            return this._udp.dial(target, clientInfo);
        }

        return this._tcp.dial(target, clientInfo);
    }

}