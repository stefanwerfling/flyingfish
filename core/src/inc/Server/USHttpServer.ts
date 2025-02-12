import {Logger} from '../Logger/Logger.js';
import {FileHelper} from '../Utils/FileHelper.js';
import {BaseHttpServer, BaseHttpServerOptions} from './BaseHttpServer.js';
import path from 'path';

/**
 * USHttpServer options
 */
export type USHttpServerOptions = BaseHttpServerOptions & {
    socket: {
        mainPath: string;
        socketName: string;
    };
};

/**
 * Unix socket http server (server for intern connection)
 */
export class USHttpServer extends BaseHttpServer {

    /**
     * Unix Path
     * @protected
     */
    protected _unixPath: string = '';

    /**
     * socket main path
     * @protected
     */
    protected _socketMainPath: string;

    /**
     * socket name
     * @protected
     */
    protected _socketName: string;

    /**
     * Constructor
     * @param {USHttpServerOptions} serverInit
     */
    public constructor(serverInit: USHttpServerOptions) {
        super(serverInit);

        this._socketMainPath = serverInit.socket.mainPath;
        this._socketName = serverInit.socket.socketName;
    }

    /**
     * Create a "unix socket" path for nginx
     * @returns {string}
     * @protected
     */
    protected async _getUnixSocket(): Promise<string> {
        const sockDirectory = path.join(this._socketMainPath, 'socks');

        if (!await FileHelper.directoryExist(sockDirectory)) {
            await FileHelper.mkdir(sockDirectory, true);
        }

        const sockUnix = path.join(sockDirectory, `${this._socketName}.sock`);

        if (await FileHelper.fileExist(sockUnix, true, true)) {
            await FileHelper.fileDelete(sockUnix);
        }

        return sockUnix;
    }

    /**
     * Return the unix socket
     * @returns {string}
     */
    public getUnixSocket(): string {
        return this._unixPath;
    }

    /**
     * start the listen
     */
    public override async listen(): Promise<void> {
        const app = this._express;
        this._unixPath = await this._getUnixSocket();

        this._server = app.listen(this._unixPath, () => {
            Logger.getLogger().info(
                'USHttpServer::listen: %s listening on the socket %s',
                this._realm,
                this._unixPath
            );

            FileHelper.chmod(this._unixPath, 0o777);

            Logger.getLogger().info(
                'USHttpServer::listen: set chmod 777 to socket %s',
                this._unixPath
            );
        });

        this._server.on('error', (err) => {
            Logger.getLogger().error('USHttpServer::error', err);
        });
    }

}