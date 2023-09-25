import {Ssdp} from '../Ssdp/Ssdp.js';
import {ClientOptions} from './Client/ClientOptions.js';
import {UpnpNatDevice} from './UpnpNatDevice.js';
import {UpnpNatGateway} from './UpnpNatGateway.js';
import {Mapping} from './Mapping/Mapping.js';
import {MappingOptions} from './Mapping/MappingOptions.js';
import {StandardOpts} from './Mapping/StandardOpts.js';
import {NewPortMappingOpts} from './Mapping/NewPortMappingOpts.js';
import {RawResponse} from './Device/RawResponse.js';

/**
 * UpnpNat client instance.
 */
export class UpnpNatClient {

    /**
     * client connection timeout
     */
    public _timeout: number = 1800;

    /**
     * Ssdp client.
     * @member {Ssdp}
     */
    protected _ssdp: Ssdp = new Ssdp();

    /**
     * Constructor from UpnpNat client.
     * @param {ClientOptions} options
     */
    public constructor(options: ClientOptions) {
        if (options.timeout) {
            this._timeout = options.timeout;
        }

        if (options.gatewayAddress) {
            this._ssdp.setDirectAddress(options.gatewayAddress);
        }
    }

    /**
     * Return the public ip.
     * @returns {string}
     */
    public async getPublicIp(): Promise<string> {
        return this.getGateway().then(async({gateway}) => {
            const data = await gateway.run('GetExternalIPAddress', []);

            const key = Object.keys(data || {}).find((k) => (/^GetExternalIPAddressResponse$/u).test(k));

            if (!key) {
                throw new Error('Incorrect response');
            }

            return `${data[key]?.NewExternalIPAddress}`;
        });
    }

    /**
     * Return the current Mapping on a device.
     * @param {MappingOptions} options
     * @returns {Mapping[]}
     */
    public async getMappings(options: MappingOptions = {}): Promise<Mapping[]> {
        const {gateway, address} = await this.getGateway();

        const publicIp = await this.getPublicIp();

        let i = 0;
        let end = false;
        const results: Mapping[] = [];

        let loop = true;

        while (loop) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const rawdata = await gateway.run(
                    'GetGenericPortMappingEntry',
                    [['NewPortMappingIndex', i++]]
                );

                const data = (rawdata)!;

                const key = Object.keys(data || {}).find(
                    (k) => (/^GetGenericPortMappingEntryResponse/u).test(k)
                );

                if (!key) {
                    throw new Error('Incorrect response');
                }

                const res: any = data[key];

                const result: Mapping = {
                    public: {
                        gateway: this._ssdp.getDirectAddress(),
                        host:
                            (typeof res.NewRemoteHost === 'string' && res.NewRemoteHost) || publicIp,
                        port: parseInt(res.NewExternalPort, 10)
                    },
                    private: {
                        host: res.NewInternalClient,
                        port: parseInt(res.NewInternalPort, 10)
                    },
                    protocol: res.NewProtocol.toLowerCase(),
                    enabled: res.NewEnabled === '1',
                    description: res.NewPortMappingDescription,
                    ttl: parseInt(res.NewLeaseDuration, 10),
                    local: false
                };

                result.local = result.private.host === address;

                if (options.local && !result.local) {
                    continue;
                }

                if (options.description) {
                    if (typeof result.description !== 'string') {
                        continue;
                    }

                    if (options.description instanceof RegExp) {
                        if (!options.description.test(result.description)) {
                            continue;
                        }
                    } else if (result.description.indexOf(options.description) === -1) {
                        continue;
                    }
                }

                results.push(result);
            } catch (error) {
                if (i !== 1) {
                    end = true;
                }
            }

            if (end) {
                loop = false;
                break;
            }
        }

        return results;
    }

    /**
     * Return a gateway.
     * @returns {UpnpNatGateway}
     */
    public async getGateway(): Promise<UpnpNatGateway> {
        let timeouted = false;

        const p = this._ssdp.search(
            'urn:schemas-upnp-org:device:InternetGatewayDevice:1'
        );

        return new Promise<UpnpNatGateway>((s, r) => {
            const timeout = setTimeout(() => {
                timeouted = true;
                p.emit('end');
                r(new Error('Connection timed out while searching for the gateway.'));
            }, this._timeout);

            p.on(
                'device',
                (
                    info,
                    address
                ) => {
                    if (timeouted) {
                        return;
                    }

                    p.emit('end');

                    clearTimeout(timeout);

                    const usnParts = info.usn.split('::');
                    let uuid = '';

                    if (usnParts.length > 1) {
                        const uuidParts = usnParts[0].split(':');

                        if (uuidParts.length > 1) {
                            uuid = uuidParts[1];
                        }
                    }

                    s({
                        gateway: new UpnpNatDevice(info.location, uuid),
                        address: address
                    });
                }
            );
        });
    }

    protected _normalizeOptions(options: StandardOpts): any {
        const toObject = (addr: StandardOpts['public']): { port?: number; } => {
            if (typeof addr === 'number') {
                return {
                    port: addr
                };
            }

            if (typeof addr === 'string') {
                const aPort = parseInt(addr, 10) || 0;

                if (aPort > 0) {
                    return {
                        port: aPort
                    };
                }
            }

            if (typeof addr === 'object') {
                return addr;
            }

            return {};
        };

        return {
            remote: toObject(options.public),
            internal: toObject(options.private)
        };
    }

    /**
     * Create port mapping on a device.
     * @param {NewPortMappingOpts} options
     * @returns {RawResponse}
     */
    public async createMapping(options: NewPortMappingOpts): Promise<RawResponse> {
        return this.getGateway().then(({gateway, address}) => {
            const ports = this._normalizeOptions(options);

            if (typeof ports.remote.host === 'undefined') {
                ports.remote.host = '';
            }

            let clientAddress = ports.internal.host || address;

            if (options.clientAddress !== '') {
                clientAddress = options.clientAddress;
            }

            return gateway.run('AddPortMapping', [
                [
                    'NewRemoteHost',
                    `${ports.remote.host}`
                ],
                [
                    'NewExternalPort',
                    `${ports.remote.port}`
                ],
                [
                    'NewProtocol',
                    options.protocol ? options.protocol.toUpperCase() : 'TCP'
                ],
                [
                    'NewInternalPort',
                    `${ports.internal.port}`
                ],
                [
                    'NewInternalClient',
                    clientAddress
                ],
                [
                    'NewEnabled',
                    1
                ],
                [
                    'NewPortMappingDescription',
                    options.description || 'node:nat:upnp'
                ],
                [
                    'NewLeaseDuration',
                    options.ttl ?? 60 * 30
                ]
            ]);
        });
    }

    /**
     * Remove a mapping from a device.
     * @param {StandardOpts} options
     * @returns {RawResponse}
     */
    public async removeMapping(options: StandardOpts): Promise<RawResponse> {
        return this.getGateway().then(({gateway}) => {
            const ports = this._normalizeOptions(options);

            if (typeof ports.remote.host === 'undefined') {
                ports.remote.host = '';
            }

            return gateway.run('DeletePortMapping', [
                [
                    'NewRemoteHost',
                    `${ports.remote.host}`
                ],
                [
                    'NewExternalPort',
                    `${ports.remote.port}`
                ],
                [
                    'NewProtocol',
                    options.protocol ? options.protocol.toUpperCase() : 'TCP'
                ]
            ]);
        });
    }

    /**
     * Close the ssdp.
     */
    public close(): void {
        this._ssdp.close();
    }

}