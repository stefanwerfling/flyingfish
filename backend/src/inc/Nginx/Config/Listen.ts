/**
 * Listen
 */
export class Listen {

    /**
     * ip
     * @protected
     */
    protected _ip: string;

    /**
     * port
     * @protected
     */
    protected _port: number;

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
     * default server
     * @protected
     */
    protected _default_server: boolean;

    /**
     * constructor
     * @param port
     * @param ip
     * @param ssl
     * @param http2
     */
    public constructor(port: number, ip: string = '', ssl: boolean = false, http2: boolean = false, default_server: boolean = false) {
        this._port = port;
        this._ip = ip;
        this._ssl = ssl;
        this._http2 = http2;
        this._default_server = default_server;
    }

    /**
     * generate
     */
    public generate(): string {
        let value = 'listen ';

        if (this._ip !== '') {
            value += `${this._ip}:`;
        }

        value += `${this._port}`;

        if (this._ssl) {
            value += ' ssl';
        }

        if (this._http2) {
            value += ' http2';
        }

        if (this._default_server) {
            value += ' default_server';
        }

        return `${value};`;
    }

}