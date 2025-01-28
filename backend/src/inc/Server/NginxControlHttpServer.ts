import {BaseHttpServer, FileHelper, Logger} from 'flyingfish_core';
import path from 'path';
import {AddressAccess as NjsAddressAccessController} from '../../Routes/Njs/AddressAccess.js';
import {AuthBasic as NjsAuthBasicController} from '../../Routes/Njs/AuthBasic.js';
import {Config} from '../Config/Config.js';

export class NginxControlHttpServer extends BaseHttpServer {

    public static UNIX_ADDRESS = 'nginx_control';

    /**
     * Unix Path
     * @protected
     */
    protected _unixPath: string = '';

    /**
     * Create a "unix socket" path for nginx
     * @returns {string}
     * @private
     */
    private async _getUnixSocket(): Promise<string> {
        const sockDirectory = path.join(Config.getInstance().get()!.nginx!.prefix, 'socks');

        if (!await FileHelper.directoryExist(sockDirectory)) {
            await FileHelper.mkdir(sockDirectory, true);
        }

        const sockUnix = path.join(sockDirectory, `${NginxControlHttpServer.UNIX_ADDRESS}.sock`);

        if (await FileHelper.fileExist(sockUnix, true)) {
            await FileHelper.fileDelete(sockUnix);
        }

        return sockUnix;
    }

    public constructor() {
        super({
            realm: 'FlyingFish Nginx control',
            routes: [
                new NjsAddressAccessController(),
                new NjsAuthBasicController(),
            ]
        });
    }

    /**
     * start the listen
     */
    public async listen(): Promise<void> {
        const app = this._server;
        this._unixPath = await this._getUnixSocket();

        const server = app.listen(this._unixPath, () => {
            Logger.getLogger().info(
                'NginxControlHttpServer::listen: %s listening on the socket %s',
                this._realm,
                this._unixPath
            );

            FileHelper.chmod(this._unixPath, 0o777);

            Logger.getLogger().info(
                'NginxControlHttpServer::listen: set chmod 777 to socket %s',
                this._unixPath
            );
        });

        server.on('error', (err) => {
            Logger.getLogger().error('NginxControlHttpServer::error', err);
        });
    }

    /**
     * Return the unix socket
     */
    public getUnixSocket(): string {
        return this._unixPath;
    }

}