import {Device} from './Device.js';
import {RawResponse} from './RawResponse.js';
import {Ssdp} from './Ssdp.js';

/**
 * This Upnp Nat Client is a fork/copy of the project https://github.com/runonflux/nat-upnp
 * unfortunately I could not make an object derivation because the important change point
 * was declared private. I decided to accept everything and then import my changes.
 * The current client can only specifically address a device from a subnet in an
 * upper network and request a UPNP-Nat there in order to forward a port. It must be
 * ensured that the IP information is correct, as only one IP from the respective network
 * area can be requested.
 * @author Stefan Werfling
 */

/**
 * Mapping
 */
export interface Mapping {
    public: {
        gateway: string;
        host: string;
        port: number;
    };
    private: {
        host: string;
        port: number;
    };
    protocol: string;
    enabled: boolean;
    description?: string;
    ttl: number;
    local: boolean;
}

/**
 * Standard options that many options use.
 */
export interface StandardOptAddress {
    port?: number;
    host?: string;
}

/**
 * StandardOpts
 */
export interface StandardOpts {
    public?: number | StandardOptAddress | string;
    private?: number | StandardOptAddress | string;
    protocol?: string;
}

/**
 * NewPortMappingOpts
 */
export interface NewPortMappingOpts extends StandardOpts {
    description?: string;

    /*
     * this is the address/ip of privat port destination
     * you can set, when the nat-upnp client not listen in the same network
     * for exsample in a docker container with own network
     */
    clientAddress?: string;

    // value MUST be between 1 second and 604800 seconds
    ttl?: number;
}

/**
 * UpnpNatClientOptions
 */
export type UpnpNatClientOptions = {
    timeout?: number;

    /*
     * A multicast address does not work in a subnetwork, e.g. in the
     * Docker container, because it remains in the network area.
     * In order to be able to address a device in the higher network,
     * it can address it directly with the address/IP.
     */
    gatewayAddress?: string;
};

/**
 * DeletePortMappingOpts
 */
export type DeletePortMappingOpts = StandardOpts;

/**
 * GetMappingOpts
 */
export interface GetMappingOpts {

    /**
     * local
     */
    local?: boolean;

    /**
     * description
     */
    description?: RegExp | string;
}

/**
 * Main client interface.
 */
export interface IClient {

    /**
     * Create a new port mapping
     * @param options Options for the new port mapping
     */
    createMapping(options: NewPortMappingOpts): Promise<RawResponse>;

    /**
     * Remove a port mapping
     * @param options Specify which port mapping to remove
     */
    removeMapping(options: DeletePortMappingOpts): Promise<RawResponse>;

    /**
     * Get a list of existing mappings
     * @param options Filter mappings based on these options
     */
    getMappings(options?: GetMappingOpts): Promise<Mapping[]>;

    /**
     * Fetch the external/public IP from the gateway
     */
    getPublicIp(): Promise<string>;

    /**
     * Get the gateway device for communication
     */
    getGateway(): Promise<{ gateway: Device; address: string; }>;

    /**
     * Close the underlaying sockets and resources
     */
    close(): void;
}

/**
 * normalizeOptions
 * @param options
 */
const normalizeOptions = (options: StandardOpts): any => {
    const toObject = (addr: StandardOpts['public']): { port?: number; } => {
        if (typeof addr === 'number') {
            return {
                port: addr
            };
        }

        // TODO debug
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
};

/**
 * UpnpNatClient
 */
export class UpnpNatClient implements IClient {

    /**
     * timeout
     */
    public readonly timeout: number;

    /**
     * ssdp
     */
    public readonly ssdp = new Ssdp();

    /**
     * constructor
     * @param options
     */
    public constructor(options: UpnpNatClientOptions = {}) {
        this.timeout = options.timeout || 1800;

        if (options.gatewayAddress) {
            this.ssdp.setDirectAddress(options.gatewayAddress);
        }
    }

    /**
     * createMapping
     * @param options
     */
    public async createMapping(
        options: NewPortMappingOpts
    ): Promise<RawResponse> {
        return this.getGateway().then(({
            gateway,
            address
        }) => {
            const ports = normalizeOptions(options);

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

    public async removeMapping(
        options: DeletePortMappingOpts
    ): Promise<RawResponse> {
        return this.getGateway().then(({gateway}) => {
            const ports = normalizeOptions(options);

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
     * getMappings
     * @param options
     */
    public async getMappings(options: GetMappingOpts = {}): Promise<Mapping[]> {
        const {
            gateway,
            address
        } = await this.getGateway();
        let i = 0;
        let end = false;
        const results = [];

        const publicIp = await this.getPublicIp();

        // eslint-disable-next-line no-constant-condition
        while (true) {
            // eslint-disable-next-line no-await-in-loop
            const data = (await gateway
            .run(
                'GetGenericPortMappingEntry',
                [
                    [
                        'NewPortMappingIndex',
                        i++
                    ]
                ]
            )
            // eslint-disable-next-line no-loop-func
            .catch(() => {
                if (i !== 1) {
                    end = true;
                }
            }))!;

            if (end) {
                break;
            }

            // eslint-disable-next-line require-unicode-regexp
            const key = Object.keys(data || {}).find((k) => (/^GetGenericPortMappingEntryResponse/).test(k));

            if (!key) {
                throw new Error('Incorrect response');
            }

            const res: any = data[key];

            const result: Mapping = {
                public: {
                    gateway: this.ssdp.getDirectAddress(),
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
                // temporary, so typescript will compile
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
        }

        return results;
    }

    /**
     * getPublicIp
     */
    public async getPublicIp(): Promise<string> {
        return this.getGateway().then(async({gateway}) => {
            const data = await gateway.run('GetExternalIPAddress', []);

            // eslint-disable-next-line require-unicode-regexp
            const key = Object.keys(data || {}).find((k) => (/^GetExternalIPAddressResponse$/).test(k));

            if (!key) {
                throw new Error('Incorrect response');
            }
            return `${data[key]?.NewExternalIPAddress}`;
        });
    }

    /**
     * getGateway
     */
    public async getGateway(): Promise<{ gateway: Device; address: string; }> {
        let timeouted = false;
        const p = this.ssdp.search(
            'urn:schemas-upnp-org:device:InternetGatewayDevice:1'
        );

        return new Promise<{ gateway: Device; address: string; }>((
            s,
            r
        ) => {
            const timeout = setTimeout(() => {
                timeouted = true;
                p.emit('end');
                r(new Error('Connection timed out while searching for the gateway.'));
            }, this.timeout);
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

                    // Create gateway
                    s({
                        gateway: new Device(info.location, uuid),
                        address: address
                    });
                }
            );
        });
    }

    /**
     * close
     */
    public close(): void {
        this.ssdp.close();
    }

}