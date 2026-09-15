import {ClusterPeerChannel} from './ClusterPeerChannel.js';
import {ClusterRouteTable} from './ClusterRouteTable.js';
import {IClusterTunDevice} from './ClusterTunDevice.js';
import {Ipv4Packet} from './Ipv4Packet.js';

/**
 * Resolves a nodeUid to its currently-connected peer channel, or undefined if the
 * peer is not connected. {@link ClusterMembership.getChannel} satisfies this.
 */
export type ClusterChannelProvider = (nodeUid: string) => ClusterPeerChannel | undefined;

/**
 * Datapath counters for observability.
 */
export type ClusterDatapathStats = {
    forwarded: number;
    dropped: number;
    received: number;
};

/**
 * The L3 datapath of the cluster mesh (Cluster/Mesh epic 9.5.1, slice 4). It
 * bridges a {@link IClusterTunDevice} and the authenticated peer channels:
 *
 * - Outbound (kernel → mesh): each packet the kernel routes into the TUN device is
 *   parsed for its destination IP, looked up in the {@link ClusterRouteTable} to
 *   find the owning nodeUid, and sent over that peer's channel. A packet with no
 *   route, an unconnected peer, or a non-IPv4 header is dropped.
 * - Inbound (mesh → kernel): each message a peer sends is a raw IP packet, written
 *   straight back to the TUN device.
 *
 * The datapath is transport-agnostic — the channels come from either the TCP-TLS
 * or the WSS transport — and device-agnostic, so the very same routing runs over a
 * real Linux TUN device in production and a fake device in tests.
 */
export class ClusterDatapath {

    private readonly _tun: IClusterTunDevice;

    private readonly _routes: ClusterRouteTable;

    private readonly _channelFor: ClusterChannelProvider;

    private _started = false;

    private _forwarded = 0;

    private _dropped = 0;

    private _received = 0;

    /**
     * @param tun - the TUN device to bridge
     * @param routes - the overlay-IP → nodeUid routing table
     * @param channelFor - resolves a nodeUid to its peer channel
     */
    public constructor(tun: IClusterTunDevice, routes: ClusterRouteTable, channelFor: ClusterChannelProvider) {
        this._tun = tun;
        this._routes = routes;
        this._channelFor = channelFor;
    }

    /**
     * Begin forwarding outbound packets read from the TUN device. Idempotent.
     */
    public start(): void {
        if (this._started) {
            return;
        }

        this._started = true;
        this._tun.onPacket((packet: Uint8Array): void => this._onOutbound(packet));
    }

    /**
     * Attach a peer channel so its inbound packets are written to the TUN device.
     * Wire this from {@link ClusterMembership.onPeer} so every peer is bridged.
     * @param channel - the authenticated peer channel
     */
    public attachPeer(channel: ClusterPeerChannel): void {
        channel.onMessage((message: Uint8Array): void => {
            this._received += 1;
            this._tun.writePacket(message);
        });
    }

    /**
     * The datapath counters (forwarded / dropped outbound, received inbound).
     */
    public stats(): ClusterDatapathStats {
        return {forwarded: this._forwarded, dropped: this._dropped, received: this._received};
    }

    /**
     * Route one outbound packet from the TUN device to the owning peer.
     * @param packet - the raw packet read from the device
     */
    private _onOutbound(packet: Uint8Array): void {
        const header = Ipv4Packet.parse(packet);

        if (header === null) {
            this._dropped += 1;
            return;
        }

        const nodeUid = this._routes.lookup(header.destination);

        if (nodeUid === undefined) {
            this._dropped += 1;
            return;
        }

        const channel = this._channelFor(nodeUid);

        if (channel === undefined) {
            this._dropped += 1;
            return;
        }

        channel.send(packet);
        this._forwarded += 1;
    }

}