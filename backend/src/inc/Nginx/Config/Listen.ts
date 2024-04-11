/**
 * ListenProtocol
 */
export enum ListenProtocol {
    none = '',
    tcp = 'tcp',
    udp = 'udp'
}

/**
 * ListenDestinationNetwork
 */
export type ListenDestinationNetwork = {
    ip: string;
    port: number;
};

/**
 * ListenDestination
 */
export type ListenDestination = {
    network?: ListenDestinationNetwork;
    unix?: string;
};

/**
 * Listen
 */
export class Listen {

    /**
     * destination
     * @protected
     */
    protected _destination: ListenDestination;

    /**
     * ssl
     * @protected
     */
    protected _ssl: boolean;

    /**
     * http2
     * @protected
     */
    protected _http2: boolean;

    /**
     * proxy protocol
     * @protected
     */
    protected _proxy_protocol: boolean;

    /**
     * protocol
     * @protected
     */
    protected _protocol: ListenProtocol = ListenProtocol.none;

    /**
     * default server
     * @protected
     */
    protected _default_server: boolean;

    /**
     * constructor
     * @param {ListenDestination} destination
     * @param {boolean} ssl
     * @param {boolean} http2
     * @param {boolean} proxy_protocol
     * @param {ListenProtocol} protocol
     * @param {boolean} default_server
     */
    public constructor(
        destination: ListenDestination,
        ssl: boolean = false,
        http2: boolean = false,
        proxy_protocol: boolean = false,
        protocol: ListenProtocol = ListenProtocol.none,
        default_server: boolean = false
    ) {
        this._destination = destination;
        this._ssl = ssl;
        this._http2 = http2;
        this._proxy_protocol = proxy_protocol;
        this._protocol = protocol;
        this._default_server = default_server;
    }

    /**
     * generate
     */
    public generate(): string {
        let value = 'listen ';

        if (this._destination.unix) {
            value += `unix:${this._destination.unix}`;
        } else if(this._destination.network) {
            if (this._destination.network.ip !== '') {
                value += `${this._destination.network.ip}:`;
            }

            value += `${this._destination.network.port}`;
        }

        if (this._ssl) {
            value += ' ssl';
        }

        if (this._http2) {
            value += ' http2';
        }

        if (this._proxy_protocol) {
            value += ' proxy_protocol';
        }

        if (this._protocol !== ListenProtocol.none) {
            value += ` ${this._protocol}`;
        }

        if (this._default_server) {
            value += ' default_server';
        }

        return `${value};`;
    }

}