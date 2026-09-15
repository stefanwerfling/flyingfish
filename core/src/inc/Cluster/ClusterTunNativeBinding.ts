/**
 * The shape of the native TUN addon (`flyingfish_clustertun`) as the JS
 * {@link NativeTunDevice} adapter consumes it (Cluster/Mesh epic 9.5.1). Declared
 * here — and injected — so `core` never hard-depends on the native package: the
 * privileged datapath container loads it and passes it in, and tests pass a fake.
 * Mirrors the addon's `TunDevice` class.
 */

/**
 * An opened native Linux TUN device: raw IP packets in/out.
 */
export interface TunNativeDevice {

    /**
     * The interface name the device was opened with.
     */
    readonly ifName: string;

    /**
     * Read the next IP packet from the device, or null at end of stream.
     */
    recv(): Promise<Buffer | null>;

    /**
     * Write one IP packet to the device.
     * @param packet - the raw IP packet
     */
    send(packet: Buffer): Promise<void>;

    /**
     * Close the device.
     */
    close(): Promise<void>;
}

/**
 * The native addon module: `TunDevice.open(name)` creates and brings up a TUN
 * interface (requires CAP_NET_ADMIN).
 */
export interface TunNativeBinding {
    TunDevice: {
        open(name: string): TunNativeDevice;
    };
}