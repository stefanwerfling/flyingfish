import fs from 'fs';
import net from 'net';
import * as ssh2 from 'ssh2';
import {Connection, Server, ServerChannel} from 'ssh2';
import {SshPort as SshPortDB} from '../Db/MariaDb/Entity/SshPort';
import {SshUser as SshUserDB} from '../Db/MariaDb/Entity/SshUser';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import * as bcrypt from 'bcrypt';
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
     * constructor
     * @param options
     */
    public constructor(options: SshServerOptions) {
        this._server = new ssh2.Server({
            hostKeys: [fs.readFileSync(options.hostKeys)]
        }, this._onConnection);
    }

    /**
     * _onConnection
     * @param client
     * @protected
     */
    protected _onConnection(client: Connection): void {
        const sshUserRepository = MariaDbHelper.getRepository(SshUserDB);
        const sshPortRepository = MariaDbHelper.getRepository(SshPortDB);

        console.log('Client connected!');

        let sshPort: SshPortDB|null = null;
        let shellChannel: ServerChannel|null = null;

        client.on('authentication', async(ctx) => {
            if (ctx.method === 'password') {
                const user = await sshUserRepository.findOne({
                    where: {
                        username: ctx.username
                    }
                });

                if (user) {
                    const bresult = await bcrypt.compare(ctx.password, user.password);

                    if (bresult) {
                        const aport = await sshPortRepository.findOne({
                            where: {
                                ssh_user_id: user.id
                            }
                        });

                        if (aport) {
                            sshPort = aport;
                        }

                        ctx.accept();
                    }
                } else {
                    ctx.reject();
                }
            } else {
                ctx.reject();
            }
        }).on('ready', () => {
            console.log('Client authenticated!');

            let fserver: net.Server|null = null;

            client.on('session', (accept) => {
                const session = accept();

                session.on('shell', (accept2) => {
                    shellChannel = accept2();
                    shellChannel.write('Shell-Info:\n');
                });
            }).on('request', (accept, reject, name, info) => {
                if ((name === 'tcpip-forward') && (sshPort !== null)) {
                    if (accept) {
                        accept();
                    }

                    fserver = net.createServer((socket) => {
                        socket.setEncoding('utf8');

                        client.forwardOut(
                            info.bindAddr,
                            info.bindPort,
                            socket.remoteAddress!,
                            socket.remotePort!,
                            (err, upstream) => {
                                if (err) {
                                    socket.end();

                                    if (shellChannel) {
                                        shellChannel.stderr.write(`not working: ${err}\n`);
                                    }

                                    console.error(`not working: ${err}`);

                                    return;
                                }

                                upstream.pipe(socket).pipe(upstream);
                                upstream.once('data', (chunk: any) => {
                                    if (chunk) {
                                        console.log(`recive data by userid: ${sshPort?.ssh_user_id}`);
                                    }
                                });
                            }
                        );
                    }).listen(sshPort!.port, () => {
                        if (shellChannel) {
                            shellChannel.write('Listen start on Flyingfish ...');
                        }

                        console.log(`Listening remote forward on port ${sshPort!.port}->${info.bindPort} by userid: ${sshPort?.ssh_user_id}`);
                    });

                } else if (reject) {
                    reject();
                }
            }).on('close', (hadError) => {
                if (hadError) {
                    console.log('Client close with error!');
                }

                if (fserver) {
                    fserver.close();
                }
            });
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