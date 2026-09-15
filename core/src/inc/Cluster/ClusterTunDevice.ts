/**
 * The TUN device the L3 datapath rides on (Cluster/Mesh epic 9.5.1). A TUN device
 * carries raw IPv4/IPv6 packets between the kernel and userspace; the datapath
 * reads packets the kernel routes into the mesh and writes back the packets peers
 * send it. Abstracted behind this interface so the datapath — and its tests — do
 * not depend on the concrete device: the production implementation opens a Linux
 * TUN device (a native binding, requires NET_ADMIN and runs in its own privileged
 * datapath container, kept out of the DB-free control part), while tests drive a
 * fake in-memory device. Keeping this an interface is also where a future
 * platform-specific device (e.g. a Raspberry-Pi build) plugs in.
 */
export interface IClusterTunDevice {

    /**
     * Register the handler called with each raw packet read from the device.
     * @param handler - called with each outbound packet (kernel → mesh)
     */
    onPacket(handler: (packet: Uint8Array) => void): void;

    /**
     * Write a raw packet to the device (mesh → kernel).
     * @param packet - the raw IP packet a peer sent
     */
    writePacket(packet: Uint8Array): void;

    /**
     * Close the device.
     */
    close(): Promise<void>;

}