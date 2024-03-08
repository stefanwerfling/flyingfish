import {Logger} from 'flyingfish_core';
import fs from 'fs';
import path from 'path';
import ssh2, {ClientInfo, Connection, Server as Ssh2Server} from 'ssh2';
import {SshClient} from './SshClient.js';
import {SshKeygen} from './SshKeygen.js';

const {Server} = ssh2;

/**
 * SshServerOptions
 */
export type SshServerOptions = {
    hostKeys?: string;
    hostKeysPath?: string;
};

/**
 * SshServer
 */
export class SshServer {

    /**
     * instance
     * @private
     */
    private static _instance: SshServer|null = null;

    /**
     * getInstance
     * @param options
     */
    public static async getInstance(options: SshServerOptions | null = null): Promise<SshServer> {
        if (SshServer._instance === null) {
            let hostKeyRsaFile = './ssh/ssh_host_rsa_key';

            if (options !== null) {
                if (options.hostKeysPath) {
                    hostKeyRsaFile = path.join(options.hostKeysPath, 'ssh_host_rsa_key');
                }

                if (options.hostKeys) {
                    hostKeyRsaFile = options.hostKeys;
                }
            }

            if (!fs.existsSync(hostKeyRsaFile)) {
                Logger.getLogger().info(`SshServer::getInstance: Keyfile not found, create new: ${hostKeyRsaFile}`);

                if (!await SshKeygen.create2(hostKeyRsaFile)) {
                    Logger.getLogger().error('SshServer::getInstance: Keyfile can not create!');

                    throw new Error(`SshServer::getInstance: Keyfile can not create! ${hostKeyRsaFile}`);
                }
            }

            SshServer._instance = new SshServer(hostKeyRsaFile);
        }

        return SshServer._instance!;
    }

    /**
     * server
     * @protected
     */
    protected _server: Ssh2Server;

    /**
     * clients
     * @protected
     */
    protected _clients: Map<string, SshClient>;

    /**
     * constructor
     * @param {string} hostKeys
     */
    private constructor(hostKeys: string) {
        this._clients = new Map<string, SshClient>();

        const self = this.getSelf();

        this._server = new Server({
            hostKeys: [fs.readFileSync(hostKeys)]
        }, (client: Connection, info: ClientInfo) => {
            self._onClientConnect(client, info);
        });
    }

    /**
     * getSelf
     */
    public getSelf(): SshServer {
        return this;
    }

    /**
     * _onClientConnect
     * @param client
     * @param info
     * @protected
     */
    public _onClientConnect(client: Connection, info: ClientInfo): void {
        console.log('SshServer::_onConnection: Client connected!');

        const aclient = new SshClient(client, info);
        this._clients.set(aclient.getIdent(), aclient);

        client.on('close', (hadError) => {
            aclient.close(hadError);
            this._clients.delete(aclient.getIdent());
        });
    }

    /**
     * listen
     */
    public listen(): void {
        this._server.listen(22, '0.0.0.0', () => {
            Logger.getLogger().info(`SshServer::listen: Listening on port ${this._server.address().port}`);
        });
    }

}