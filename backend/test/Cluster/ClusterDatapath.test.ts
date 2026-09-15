/**
 * Unit tests for the L3 datapath of the cluster mesh (Cluster/Mesh epic 9.5.1,
 * slice 4). Covers the IPv4 header parse, the overlay route table, the datapath's
 * outbound routing / inbound writing against a fake TUN device, and — end to end —
 * two real in-process nodes whose datapaths carry an IPv4 packet from one node's
 * (fake) TUN, over the authenticated peer channel, to the other node's TUN.
 * Network-free (loopback TLS only).
 */
import {
    ClusterDatapath,
    ClusterMembership,
    ClusterPeerInfo,
    ClusterPeerRoster,
    ClusterRouteTable,
    ClusterTlsPeerTransport,
    IClusterTunDevice,
    Ipv4Packet,
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiCertificateBuilder,
    PkiEnrollmentService
} from 'flyingfish_core';

const POLL_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 25;

/**
 * A fake TUN device: `emit` simulates a packet the kernel routed in (kernel →
 * mesh); `written` records packets the datapath wrote back (mesh → kernel).
 */
class FakeTunDevice implements IClusterTunDevice {

    public readonly written: Uint8Array[] = [];

    private _handler: ((packet: Uint8Array) => void) | null = null;

    /**
     * @inheritDoc
     */
    public onPacket(handler: (packet: Uint8Array) => void): void {
        this._handler = handler;
    }

    /**
     * @inheritDoc
     */
    public writePacket(packet: Uint8Array): void {
        this.written.push(packet);
    }

    /**
     * @inheritDoc
     */
    public async close(): Promise<void> {
        this._handler = null;
    }

    /**
     * Simulate a raw packet arriving from the kernel.
     * @param packet - the raw packet
     */
    public emit(packet: Uint8Array): void {
        if (this._handler !== null) {
            this._handler(packet);
        }
    }

}

/**
 * Build a minimal well-formed IPv4 packet with the given source/destination.
 * @param source - dotted-quad source address
 * @param destination - dotted-quad destination address
 */
const buildIpv4 = (source: string, destination: string): Uint8Array => {
    const packet = new Uint8Array(Ipv4Packet.MIN_HEADER_BYTES);
    // version 4, IHL 5
    packet[0] = 0x45;

    source.split('.').forEach((part, index) => {
        packet[12 + index] = parseInt(part, 10);
    });
    destination.split('.').forEach((part, index) => {
        packet[16 + index] = parseInt(part, 10);
    });

    return packet;
};

/**
 * Resolve once `check` is true or reject after the timeout.
 * @param check - the condition
 */
const waitFor = async(check: () => boolean): Promise<void> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (!check()) {
        if (Date.now() > deadline) {
            throw new Error('waitFor: timed out');
        }

        // eslint-disable-next-line no-await-in-loop -- sequential poll
        await new Promise((resolve): void => {
            setTimeout(resolve, POLL_INTERVAL_MS);
        });
    }
};

describe('Ipv4Packet', () => {
    test('parses source and destination of a well-formed IPv4 packet', () => {
        const header = Ipv4Packet.parse(buildIpv4('10.42.0.1', '10.42.0.9'));

        expect(header).not.toBeNull();
        expect(header!.version).toBe(4);
        expect(header!.source).toBe('10.42.0.1');
        expect(header!.destination).toBe('10.42.0.9');
    });

    test('rejects a non-IPv4 packet (wrong version nibble)', () => {
        const packet = buildIpv4('10.42.0.1', '10.42.0.9');
        // version 6
        packet[0] = 0x60;

        expect(Ipv4Packet.parse(packet)).toBeNull();
    });

    test('rejects a packet shorter than an IPv4 header', () => {
        expect(Ipv4Packet.parse(new Uint8Array(10))).toBeNull();
    });
});

describe('ClusterRouteTable', () => {
    test('set / lookup / remove / size / clear', () => {
        const routes = new ClusterRouteTable();

        routes.set('10.42.0.2', 'node-b');
        routes.set('10.42.0.3', 'node-c');

        expect(routes.lookup('10.42.0.2')).toBe('node-b');
        expect(routes.lookup('10.42.0.9')).toBeUndefined();
        expect(routes.size()).toBe(2);

        expect(routes.remove('10.42.0.2')).toBe(true);
        expect(routes.lookup('10.42.0.2')).toBeUndefined();

        routes.clear();
        expect(routes.size()).toBe(0);
    });

    test('applyRoster rebuilds routes from peers with an overlay IP', () => {
        const routes = new ClusterRouteTable();
        routes.set('10.42.0.9', 'stale-node');

        routes.applyRoster([
            {nodeUid: 'node-b', overlayIp: '10.42.0.2'},
            {nodeUid: 'node-c', overlayIp: '10.42.0.3'},
            {nodeUid: 'node-no-overlay'}
        ]);

        expect(routes.lookup('10.42.0.2')).toBe('node-b');
        expect(routes.lookup('10.42.0.3')).toBe('node-c');
        // the peer without an overlay IP contributes no route, and the stale route is gone
        expect(routes.size()).toBe(2);
        expect(routes.lookup('10.42.0.9')).toBeUndefined();
    });
});

describe('ClusterDatapath (routing against a fake TUN)', () => {
    test('outbound: forwards an IPv4 packet to the peer that owns the destination', () => {
        const tun = new FakeTunDevice();
        const routes = new ClusterRouteTable();
        routes.set('10.42.0.2', 'node-b');

        const sent: Uint8Array[] = [];
        const channel = {send: (message: Uint8Array): void => {
            sent.push(message);
        }} as unknown as Parameters<ClusterDatapath['attachPeer']>[0];

        const datapath = new ClusterDatapath(tun, routes, (nodeUid) => nodeUid === 'node-b' ? channel : undefined);
        datapath.start();

        const packet = buildIpv4('10.42.0.1', '10.42.0.2');
        tun.emit(packet);

        expect(sent).toHaveLength(1);
        expect(Buffer.from(sent[0]).equals(Buffer.from(packet))).toBe(true);
        expect(datapath.stats().forwarded).toBe(1);
        expect(datapath.stats().dropped).toBe(0);
    });

    test('outbound: drops non-IPv4, unrouted, and unconnected-peer packets', () => {
        const tun = new FakeTunDevice();
        const routes = new ClusterRouteTable();
        // routed but the peer never connects
        routes.set('10.42.0.2', 'node-b');

        const datapath = new ClusterDatapath(tun, routes, () => undefined);
        datapath.start();

        // non-IPv4
        const nonIpv4 = buildIpv4('10.42.0.1', '10.42.0.2');
        nonIpv4[0] = 0x60;
        tun.emit(nonIpv4);

        // routed, but channelFor returns undefined (peer not connected)
        tun.emit(buildIpv4('10.42.0.1', '10.42.0.2'));

        // no route for this destination
        tun.emit(buildIpv4('10.42.0.1', '10.42.0.99'));

        expect(datapath.stats().forwarded).toBe(0);
        expect(datapath.stats().dropped).toBe(3);
    });

    test('inbound: writes a peer message straight to the TUN device', () => {
        const tun = new FakeTunDevice();
        const datapath = new ClusterDatapath(tun, new ClusterRouteTable(), () => undefined);

        let messageHandler: ((message: Uint8Array) => void) | null = null;
        const channel = {onMessage: (handler: (message: Uint8Array) => void): void => {
            messageHandler = handler;
        }} as unknown as Parameters<ClusterDatapath['attachPeer']>[0];

        datapath.attachPeer(channel);

        const packet = buildIpv4('10.42.0.2', '10.42.0.1');
        messageHandler!(packet);

        expect(tun.written).toHaveLength(1);
        expect(Buffer.from(tun.written[0]).equals(Buffer.from(packet))).toBe(true);
        expect(datapath.stats().received).toBe(1);
    });
});

describe('ClusterDatapath end to end (two nodes over a real transport)', () => {
    let tree: PkiCaTreeResult;
    let tokens: PkiBootstrapTokenStore;
    let service: PkiEnrollmentService;
    let caChain: string[];

    beforeAll(async() => {
        tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
        tokens = new PkiBootstrapTokenStore();
        service = new PkiEnrollmentService(tree, tokens);
        caChain = service.getCaChain(PkiCaPurpose.cluster);
    });

    test('an IPv4 packet written to one node TUN reaches the other node TUN', async() => {
        const build = async(name: string): Promise<{nodeUid: string; membership: ClusterMembership; tun: FakeTunDevice; info: ClusterPeerInfo;}> => {
            const {token} = tokens.issue({purpose: PkiCaPurpose.cluster, autoApprove: true});
            const keys = await PkiCertificateBuilder.generateKeyPair();
            const csr = await PkiCertificateBuilder.createCsr(`CN=${name}`, keys);
            const request = await service.enroll({csr: csr, bootstrapToken: token, commonName: name});
            const pem = await PkiCertificateBuilder.exportKeyPair(keys);

            const transport = new ClusterTlsPeerTransport({
                certificate: request.issued!.certificate,
                privateKey: pem.privateKey,
                caChain: caChain
            });
            const membership = new ClusterMembership(transport, request.nodeUid);
            const tun = new FakeTunDevice();
            const port = await membership.start(0);

            return {nodeUid: request.nodeUid, membership: membership, tun: tun, info: {nodeUid: request.nodeUid, host: '127.0.0.1', port: port}};
        };

        const nodeA = await build('dpA');
        const nodeB = await build('dpB');

        // overlay addressing: A is 10.42.0.1, B is 10.42.0.2
        const overlayA = '10.42.0.1';
        const overlayB = '10.42.0.2';

        const routesA = new ClusterRouteTable();
        routesA.set(overlayB, nodeB.nodeUid);
        const routesB = new ClusterRouteTable();
        routesB.set(overlayA, nodeA.nodeUid);

        const datapathA = new ClusterDatapath(nodeA.tun, routesA, (uid) => nodeA.membership.getChannel(uid));
        const datapathB = new ClusterDatapath(nodeB.tun, routesB, (uid) => nodeB.membership.getChannel(uid));

        // attach every peer channel to the datapath BEFORE connecting so none is missed
        nodeA.membership.onPeer((channel) => datapathA.attachPeer(channel));
        nodeB.membership.onPeer((channel) => datapathB.attachPeer(channel));
        datapathA.start();
        datapathB.start();

        const roster: ClusterPeerRoster = {
            list: async(): Promise<ClusterPeerInfo[]> => [nodeA.info, nodeB.info]
        };

        await Promise.all([nodeA.membership.sync(roster), nodeB.membership.sync(roster)]);
        await waitFor((): boolean => nodeA.membership.peers().length === 1 && nodeB.membership.peers().length === 1);

        // A's kernel routes a packet destined for B's overlay IP into A's TUN
        const packet = buildIpv4(overlayA, overlayB);
        nodeA.tun.emit(packet);

        // it must arrive on B's TUN, byte-for-byte
        await waitFor((): boolean => nodeB.tun.written.length === 1);
        expect(Buffer.from(nodeB.tun.written[0]).equals(Buffer.from(packet))).toBe(true);
        expect(datapathA.stats().forwarded).toBe(1);

        await Promise.all([nodeA.membership.stop(), nodeB.membership.stop()]);
    });
});