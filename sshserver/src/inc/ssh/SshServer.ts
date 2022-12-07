import fs from 'fs';
import * as ssh2 from 'ssh2';
import {ClientInfo, Connection, Server} from 'ssh2';
import {SshClient} from './SshClient';
import {SshKeygen} from './SshKeygen';

/**
 * SshServerOptions
 */
export type SshServerOptions = {
    hostKeys: string;
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
            const hostKeyRsaFile = './ssh/ssh_host_rsa_key';

            if (!fs.existsSync(hostKeyRsaFile)) {
                console.log(`Keyfile not found, create new: ${hostKeyRsaFile}`);

                if (!await SshKeygen.create(hostKeyRsaFile)) {
                    console.log('Keyfile can not create!');

                    throw new Error(`Keyfile can not create! ${hostKeyRsaFile}`);
                }
            }

            let toptions: SshServerOptions = {
                hostKeys: hostKeyRsaFile
            };

            if (options !== null) {
                toptions = options;
            }

            SshServer._instance = new SshServer(toptions);
        }

        return SshServer._instance!;
    }

    /**
     * server
     * @protected
     */
    protected _server: Server;

    /**
     * clients
     * @protected
     */
    protected _clients: Map<string, SshClient>;

    /**
     * constructor
     * @param options
     */
    public constructor(options: SshServerOptions) {
        this._clients = new Map<string, SshClient>();

        const self = this.getSelf();

        this._server = new ssh2.Server({
            hostKeys: [fs.readFileSync(options.hostKeys)]
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
            console.log(`Listening on port ${this._server.address().port}`);
        });
    }

}