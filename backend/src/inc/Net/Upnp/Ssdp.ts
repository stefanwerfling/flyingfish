import dgram, {Socket} from 'dgram';
import os from 'os';
import EventEmitter from 'events';

/**
 * SearchArgs
 */
type SearchArgs = [Record<string, string>, string];

/**
 * SearchCallback
 */
export type SearchCallback = (...args: SearchArgs) => void;

/**
 * Events
 */
type Events = 'device' | 'end';

/**
 * SearchEvent
 */
type SearchEvent = <E extends Events>(
    ev: E,
    ...args: (([Record<string, string>, string] & 'device') | [])[]
) => boolean;

/**
 * Event
 */
type Event<E extends Events> = E extends 'device' ? SearchCallback : () => void;

/**
 * EventListener
 */
type EventListener<T> = <E extends Events>(ev: E, callback: Event<E>) => T;

/**
 * SsdpEmitter
 */
export interface SsdpEmitter extends EventEmitter {
    removeListener: EventListener<this>;
    addListener: EventListener<this>;
    once: EventListener<this>;
    on: EventListener<this>;

    emit: SearchEvent;

    _ended?: boolean;
}

/**
 * parseMimeHeader
 * @param headerStr
 */
const parseMimeHeader = (headerStr: string): any => {
    // eslint-disable-next-line require-unicode-regexp
    const lines = headerStr.split(/\r\n/g);

    // Parse headers from lines to hashmap
    return lines.reduce<Record<string, string>>((headers, line) => {
        // eslint-disable-next-line require-unicode-regexp
        const [, key, value] = line.match(/^([^:]*)\s*:\s*(.*)$/) ?? [];
        if (key && value) {
            headers[key.toLowerCase()] = value;
        }
        return headers;
    }, {});
};

/**
 * ISsdp
 */
export interface ISsdp {

    /**
     * Search for a SSDP compatible server on the network
     * @param device Search Type (ST) header, specifying which device to search for
     * @param emitter An existing EventEmitter to emit event on
     * @returns The event emitter provided in Promise, or a newly instantiated one.
     */
    search(device: string, emitter?: SsdpEmitter): SsdpEmitter;

    /**
     * Close all sockets
     */
    close(): void;
}

/**
 * Ssdp
 */
export class Ssdp implements ISsdp {

    /**
     * source port
     * @private
     */
    private sourcePort = 0;

    /**
     * bound
     * @private
     */
    private bound = false;

    /**
     * bound count
     * @private
     */
    private boundCount = 0;

    /**
     * closed
     * @private
     */
    private closed = false;

    /**
     * queue
     * @private
     */
    private readonly queue: [string, SsdpEmitter][] = [];

    /**
     * multicast
     * @private
     */
    private readonly multicast = '239.255.255.250';

    /**
     * direct address to gateway
     * @private
     */
    private _directAddress: string = '';

    /**
     * port
     * @private
     */
    private readonly port = 1900;

    /**
     * sockets
     * @private
     */
    private readonly sockets;

    /**
     * ssdpEmitter
     * @private
     */
    private readonly ssdpEmitter: SsdpEmitter = new EventEmitter();

    /**
     * constructor
     * @param options
     */
    public constructor(private options?: { sourcePort?: number; }) {
        if (options?.sourcePort) {
            this.sourcePort = options?.sourcePort;
        }
        // Create sockets on all external interfaces
        const interfaces = os.networkInterfaces();

        this.sockets = Object.keys(interfaces).reduce<Socket[]>(
            (arr, key) => arr.concat(
                interfaces[key]
                ?.filter((item) => !item.internal)
                .map((item) => this._createSocket(item)) ?? []
            ),
            []
        );
    }

    /**
     * setDirectAddress
     * @param address
     */
    public setDirectAddress(address: string): void {
        this._directAddress = address;
    }

    /**
     * getDirectAddress
     */
    public getDirectAddress(): string {
        return this._directAddress;
    }

    /**
     * _createSocket
     * @param iface
     * @private
     */
    private _createSocket(iface: any): any {
        const socket = dgram.createSocket(
            iface.family === 'IPv4' ? 'udp4' : 'udp6'
        );

        socket.on('message', (message) => {
            // Ignore messages after closing sockets
            if (this.closed) {
                return;
            }

            // Parse response
            this._parseResponse(message.toString(), socket.address as any as string);
        });

        // Bind in next tick (sockets should be me in this.sockets array)
        process.nextTick(() => {
            // Unqueue this._queue once all sockets are ready
            const onready = (): void => {
                if (this.boundCount < this.sockets.length) {
                    return;
                }

                this.bound = true;
                this.queue.forEach(([device, emitter]) => this.search(device, emitter));
            };

            socket.on('listening', () => {
                this.boundCount += 1;
                onready();
            });

            // On error - remove socket from list and execute items from queue
            socket.once('error', () => {
                socket.close();
                this.sockets.splice(this.sockets.indexOf(socket), 1);
                onready();
            });

            socket.address = iface.address;
            socket.bind(this.sourcePort, iface.address);
        });

        return socket;
    }

    /**
     * _parseResponse
     * @param response
     * @param addr
     * @private
     */
    private _parseResponse(response: string, addr: string): void {
        // Ignore incorrect packets
        // eslint-disable-next-line require-unicode-regexp
        if (!(/^(HTTP|NOTIFY)/m).test(response)) {
            return;
        }

        const headers = parseMimeHeader(response);

        /*
         * We are only interested in messages that can be matched against the original
         * search target
         */
        if (!headers.st) {
            return;
        }

        // @ts-ignore
        this.ssdpEmitter.emit('device', headers, addr);
    }

    /**
     * search
     * @param device
     * @param emitter
     */
    public search(device: string, emitter?: SsdpEmitter): SsdpEmitter {
        if (!emitter) {
            // eslint-disable-next-line no-param-reassign
            emitter = new EventEmitter();
            emitter._ended = false;
            emitter.once('end', () => {
                emitter!._ended = true;
            });
        }

        if (!this.bound) {
            this.queue.push([device, emitter]);
            return emitter;
        }

        const query = Buffer.from(
            `${'M-SEARCH * HTTP/1.1\r\n' +
            'HOST: '}${
                this.multicast
            }:${
                this.port
            }\r\n` +
            'MAN: "ssdp:discover"\r\n' +
            'MX: 1\r\n' +
            `ST: ${
                device
            }\r\n` +
            '\r\n'
        );

        let destination = this.multicast;

        if (this._directAddress !== '') {
            destination = this._directAddress;
        }

        // Send query on each socket
        this.sockets.forEach((socket) => socket.send(query, 0, query.length, this.port, destination));

        const ondevice: SearchCallback = (headers, address) => {
            if (!emitter || emitter._ended || headers.st !== device) {
                return;
            }

            // @ts-ignore
            emitter.emit('device', headers, address);
        };
        this.ssdpEmitter.on('device', ondevice);

        // Detach listener after receiving 'end' event
        emitter.once('end', () => this.ssdpEmitter.removeListener('device', ondevice));

        return emitter;
    }

    /**
     * close
     */
    public close(): void {
        this.sockets.forEach((socket) => socket.close());
        this.closed = true;
    }

}