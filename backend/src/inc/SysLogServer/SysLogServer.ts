import dgram from 'dgram';

/**
 * SysLogServerListen
 */
export type SysLogServerListen = (sysLogServer: SysLogServer) => void;

/**
 * SysLogServerMessage
 */
export type SysLogServerMessage = (sysLogServer: SysLogServer, msg: Buffer, remote: dgram.RemoteInfo) => void;

/**
 * SysLogServerError
 */
export type SysLogServerError = (sysLogServer: SysLogServer, err: Error) => void;

/**
 * SysLogServerOptions
 */
export type SysLogServerOptions = {
    port: number;
    address: string;
    exclusive: boolean;
};

/**
 * https://github.com/guithess/syslog-server/blob/master/index.js
 * http://nginx.org/en/docs/syslog.html
 * https://www.velebit.ai/blog/nginx-json-logging/
 */
export class SysLogServer {

    protected _options: SysLogServerOptions;

    /**
     * _socket
     * @protected
     */
    protected _socket: dgram.Socket | null;

    protected _onListen: SysLogServerListen | undefined;
    protected _onMessage: SysLogServerMessage | undefined;
    protected _onError: SysLogServerError | undefined;

    /**
     * constructor
     * @param options
     */
    public constructor(options: SysLogServerOptions = {
        port: 514,
        address: '127.0.0.1',
        exclusive: true
    }) {
        this._socket = null;
        this._options = options;
    }

    /**
     * getOptions
     */
    public getOptions(): SysLogServerOptions {
        return this._options;
    }

    /**
     * setOnListen
     * @param onListen
     */
    public setOnListen(onListen: SysLogServerListen): void {
        this._onListen = onListen;
    }

    /**
     * setOnMessage
     * @param onMessage
     */
    public setOnMessage(onMessage: SysLogServerMessage): void {
        this._onMessage = onMessage;
    }

    /**
     * setOnError
     * @param onError
     */
    public setOnError(onError: SysLogServerError): void {
        this._onError = onError;
    }

    /**
     * listen
     */
    public listen(): void {
        this._socket = dgram.createSocket('udp4');

        this._socket.on('listening', () => {
            if (this._onListen) {
                this._onListen(this);
            }
        });

        this._socket.on('error', (err) => {
            if (this._onError) {
                this._onError(this, err);
            }
        });

        this._socket.on('message', (msg, remote) => {
            if (this._onMessage) {
                this._onMessage(this, msg, remote);
            }
        });

        const options = this._options;

        this._socket.bind(options);
    }

    /**
     * isRunning
     */
    public isRunning(): boolean {
        return this._socket !== null;
    }

}