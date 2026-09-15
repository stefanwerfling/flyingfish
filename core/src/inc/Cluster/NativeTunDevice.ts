import {IClusterTunDevice} from './ClusterTunDevice.js';
import {TunNativeDevice} from './ClusterTunNativeBinding.js';

/**
 * {@link IClusterTunDevice} adapter over the native TUN binding (Cluster/Mesh epic
 * 9.5.1). It turns the native pull API (`recv`) into the datapath's push contract:
 * a read pump drains packets from the device into the `onPacket` handler, and
 * `writePacket` forwards to the native `send`. This is the production TUN device a
 * {@link ClusterDatapath} bridges to the peer channels; the native device is
 * opened (which needs CAP_NET_ADMIN) by the privileged datapath container and
 * injected, so `core` stays free of the native dependency.
 */
export class NativeTunDevice implements IClusterTunDevice {

    private readonly _device: TunNativeDevice;

    private _handler: ((packet: Uint8Array) => void) | null = null;

    private _running = true;

    /**
     * @param device - the opened native TUN device
     */
    public constructor(device: TunNativeDevice) {
        this._device = device;
        this._pump().catch((): void => undefined);
    }

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
        this._device.send(Buffer.from(packet)).catch((): void => undefined);
    }

    /**
     * @inheritDoc
     */
    public async close(): Promise<void> {
        this._running = false;
        await this._device.close();
    }

    /**
     * Drain packets from the device into the handler until closed or end of stream.
     */
    private async _pump(): Promise<void> {
        while (this._running) {
            // eslint-disable-next-line no-await-in-loop -- sequential device read
            const packet = await this._device.recv();

            if (packet === null) {
                break;
            }

            if (this._handler !== null) {
                this._handler(new Uint8Array(packet));
            }
        }
    }

}