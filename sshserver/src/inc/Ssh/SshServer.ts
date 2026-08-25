import {Logger} from 'flyingfish_core';
import {SshConfigChangeAction} from 'flyingfish_schemas';
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
                Logger.getLogger().info('SshServer::getInstance: Keyfile not found, create new: %s', hostKeyRsaFile);

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
        Logger.getLogger().info('SshServer::_onConnection: Client connected!');

        const aclient = new SshClient(client, info);
        this._clients.set(aclient.getIdent(), aclient);

        client.on('close', () => {
            aclient.close(false);
            this._clients.delete(aclient.getIdent());
        });
    }

    /**
     * selectAffected
     * Pure helper: pick the clients whose forward belongs to the given ssh port.
     * @param {Iterable<SshClient>} clients
     * @param {number} sshportId
     * @returns {SshClient[]}
     */
    public static selectAffected(clients: Iterable<SshClient>, sshportId: number): SshClient[] {
        const affected: SshClient[] = [];

        for (const client of clients) {
            if (client.getSshPortId() === sshportId) {
                affected.push(client);
            }
        }

        return affected;
    }

    /**
     * handleConfigChange
     * React to a backend SSH config change (phase 3, IPC): close every active
     * connection whose forward belongs to the changed ssh port. On 'saved' the
     * config (port/user/destination) may have changed, on 'deleted' it is gone -
     * either way the long-lived tunnel is stale, so it is dropped; a peer that
     * still wants it reconnects and re-reads the fresh config.
     * @param {number} sshportId
     * @param {SshConfigChangeAction} action
     * @returns {number} number of affected connections closed
     */
    public handleConfigChange(sshportId: number, action: SshConfigChangeAction): number {
        // Snapshot first: endConnection() triggers the connection 'close' handler
        // which deletes the client from the map we are iterating.
        const affected = SshServer.selectAffected(this._clients.values(), sshportId);

        for (const client of affected) {
            client.endConnection(`ssh config ${action} (sshportId: ${sshportId})`);
        }

        if (affected.length > 0) {
            Logger.getLogger().info(
                'SshServer::handleConfigChange: closed %d connection(s) for sshportId %d (action: %s)',
                affected.length,
                sshportId,
                action
            );
        }

        return affected.length;
    }

    /**
     * listen
     */
    public listen(): void {
        const port = 22;

        this._server.listen(port, '0.0.0.0', () => {
            Logger.getLogger().info('SshServer::listen: Listening on port %d', {
                port: port
            });
        });
    }

}