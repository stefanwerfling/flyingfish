import dgram from 'dgram';
import EventEmitter from 'events';
import os from 'os';
import {nextTick} from 'process';
import {SsdpEmitter} from './SsdpEmitter.js';
import {SsdpOptions} from './SsdpOptions.js';
import {SsdpSearchCallback} from './SsdpSearchCallback.js';

/**
 * Simple Service Discovery Protocol (SSDP).
 */
export class Ssdp {

    /**
     * Source port, default 0.
     * @member {number}
     */
    protected _sourcePort: number = 0;

    /**
     * Socket list for requests by any network interface.
     * @member {dgram.Socket[]}
     */
    protected _sockets: dgram.Socket[] = [];

    /**
     * Closed request, all incoming are ignored.
     * @member {number}
     */
    protected _closed: boolean = false;

    /**
     *
     * @member {number}
     */
    protected _boundCount: number = 0;

    /**
     *
     * @member {boolean}
     */
    protected _bound: boolean = false;

    protected _queue: [string, SsdpEmitter][] = [];

    /**
     * ssdpEmitter
     * @private
     */
    protected _ssdpEmitter: SsdpEmitter = new EventEmitter();

    /**
     * Multicast address.
     * @member {string}
     */
    protected _multicast: string = '239.255.255.250';

    /**
     * Direct address to device.
     * @member {string}
     */
    protected _directAddress: string = '';

    /**
     * Port for ssdp.
     * @member {number}
     */
    protected _port: number = 1900;

    /**
     * Constructor for Ssdp object.
     * @param {SsdpOptions} options - Options for Ssdp object.
     */
    public constructor(options?: SsdpOptions) {
        if (options) {
            if (options.sourcePort) {
                this._sourcePort = options.sourcePort;
            }
        }

        const interfaces = os.networkInterfaces();

        Object.keys(interfaces).forEach((name: string): void => {
            const tInterface = interfaces[name];

            if (tInterface) {
                for (const interfaceInfo of tInterface) {
                    // no use internal (loopback etc ...)
                    if (!interfaceInfo.internal) {
                        this._sockets.push(this._createSocket(interfaceInfo));
                    }
                }
            }
        });
    }

    /**
     * Set a direct address to a device.
     * @param {string} address
     */
    public setDirectAddress(address: string): void {
        this._directAddress = address;
    }

    /**
     * Get the address from a direct device.
     * @returns {string}
     */
    public getDirectAddress(): string {
        return this._directAddress;
    }

    /**
     * Create a socket to interface information.
     * @param {os.NetworkInterfaceInfo} ifaceInfo - Interface information.
     * @returns {dgram.Socket} Returns a Socket from dgram.
     */
    protected _createSocket(ifaceInfo: os.NetworkInterfaceInfo): dgram.Socket {
        const socket = dgram.createSocket(ifaceInfo.family === 'IPv4' ? 'udp4' : 'udp6');

        socket.on('message', (message: Buffer): void => {
            if (this._closed) {
                return;
            }

            this._parseResponse(message.toString(), ifaceInfo.address);
        });

        nextTick((): void => {
            const onReady = (): void => {
                if (this._boundCount < this._sockets.length) {
                    return;
                }

                this._bound = true;
                this._queue.forEach(([device, emitter]) => this.search(device, emitter));
            };

            socket.on('listening', (): void => {
                this._boundCount += 1;
                onReady();
            });

            socket.once('error', (): void => {
                socket.close();

                this._sockets.splice(
                    this._sockets.indexOf(socket),
                    1
                );

                onReady();
            });

            socket.bind(this._sourcePort, ifaceInfo.address);
        });

        return socket;
    }

    /**
     * Parse the response by socket.
     * @param {string} response
     * @param {string} addr
     */
    protected _parseResponse(response: string, addr: string): void {
        if (!(/^(HTTP|NOTIFY)/mu).test(response)) {
            return;
        }

        const headers = Ssdp.parseMimeHeader(response);

        if (!headers.st) {
            return;
        }

        this._ssdpEmitter.emit('device', headers, addr);
    }

    /**
     * Search a device, build request and send on socket.
     * @param {string} device
     * @param {SsdpEmitter} emitter
     * @returns {SsdpEmitter}
     */
    public search(device: string, emitter?: SsdpEmitter): SsdpEmitter {
        let nEmitter: SsdpEmitter;

        if (emitter) {
            nEmitter = emitter;
        } else {
            nEmitter = new EventEmitter();
            nEmitter._ended = false;
            nEmitter.once('end', () => {
                nEmitter!._ended = true;
            });
        }

        if (!this._bound) {
            this._queue.push([device, nEmitter]);
            return nEmitter;
        }

        const query = Buffer.from(
            'M-SEARCH * HTTP/1.1\r\n' +
            `HOST: ${this._multicast}:${this._port}\r\n` +
            'MAN: "ssdp:discover"\r\n' +
            'MX: 1\r\n' +
            `ST: ${device}\r\n` +
            '\r\n'
        );

        let destination = this._multicast;

        if (this._directAddress !== '') {
            destination = this._directAddress;
        }

        this._sockets.forEach((socket: dgram.Socket): void => {
            socket.send(query, 0, query.length, this._port, destination);
        });

        const ondevice: SsdpSearchCallback = (headers, address) => {
            if (!nEmitter || nEmitter._ended || headers.st !== device) {
                return;
            }

            nEmitter.emit('device', headers, address);
        };

        this._ssdpEmitter.on('device', ondevice);

        nEmitter.once('end', () => this._ssdpEmitter.removeListener('device', ondevice));

        return nEmitter;
    }

    /**
     * Close all sockets.
     */
    public close(): void {
        this._sockets.forEach((socket: dgram.Socket) => socket.close());
        this._closed = true;
    }

    /**
     * Prase mime header.
     * @param {string} headerStr
     * @returns {Record<string, string>}
     */
    public static parseMimeHeader(headerStr: string): Record<string, string> {
        const lines = headerStr.split(/\r\n/gu);

        return lines.reduce<Record<string, string>>((headers, line) => {
            const [, key, value] = line.match(/^([^:]*)\s*:\s*(.*)$/u) ?? [];

            if (key && value) {
                headers[key.toLowerCase()] = value;
            }

            return headers;
        }, {});
    }

}