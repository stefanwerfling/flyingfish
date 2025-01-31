import * as bcrypt from 'bcrypt';
import {DBHelper, Logger, SshPortDB, SshUserDB} from 'flyingfish_core';
import {AuthContext, ClientInfo, Connection, ServerChannel, Session, TcpipBindInfo, TcpipRequestInfo} from 'ssh2';
import {ISshClientForward} from './SshClientForward.js';
import {SshClientForwardL} from './SshClientForwardL.js';
import {SshClientForwardR} from './SshClientForwardR.js';
import {v4 as uuid} from 'uuid';

/**
 * SshClientUser
 */
export type SshClientUser = {
    id: number;
    username: string;
};

/**
 * SshClientForwardType
 */
export enum SshClientForwardType {
    L,
    R
}

/**
 * SshClientForwardPort
 */
export type SshClientForwardPort = {
    port: number;
    destination?: string;
    type: SshClientForwardType;
};

/**
 * SshClient
 */
export class SshClient {

    /**
     * ident
     * @protected
     */
    protected _ident: string;

    /**
     * client connection
     * @protected
     */
    protected _clientConnection: Connection;

    /**
     * client info
     * @protected
     */
    protected _clientInfo: ClientInfo;

    /**
     * user
     * @protected
     */
    protected _user: SshClientUser | undefined;

    /**
     * forward port
     * @protected
     */
    protected _forwardPort: SshClientForwardPort | undefined;

    /**
     * client session
     * @protected
     */
    protected _clientSession: Session|null = null;

    /**
     * shell channel
     * @protected
     */
    protected _shellChannel: ServerChannel|null = null;

    /**
     * client forward
     * @protected
     */
    protected _clientForward: ISshClientForward|null = null;

    /**
     * constructor
     * @param clientConnection
     * @param info
     */
    public constructor(clientConnection: Connection, info: ClientInfo) {
        this._ident = uuid();
        this._clientConnection = clientConnection;
        this._clientInfo = info;

        const self = this.getSelf();

        // register events ---------------------------------------------------------------------------------------------

        this._clientConnection.on('authentication', async(ctx: AuthContext) => {
            await self._authentication(ctx);
        });

        this._clientConnection.on('ready', () => {
            self._ready();
        });
    }

    /**
     * getSelf
     */
    public getSelf(): SshClient {
        return this;
    }

    /**
     * getIdent
     */
    public getIdent(): string {
        return this._ident;
    }

    /**
     * _authentication
     * @param ctx
     * @protected
     */
    public async _authentication(ctx: AuthContext): Promise<void> {
        if (ctx.method === 'password') {
            const sshUserRepository = DBHelper.getRepository(SshUserDB);
            const user = await sshUserRepository.findOne({
                where: {
                    username: ctx.username,
                    disable: false
                }
            });

            if (user) {
                // empty password not supported
                if (user.password === '') {
                    Logger.getLogger().error('SshClient::_authentication: empty password not allowed!');
                    ctx.reject();
                    return;
                }

                const bresult = await bcrypt.compare(ctx.password, user.password);

                if (bresult) {
                    this._user = {
                        id: user.id,
                        username: user.username
                    };

                    const sshPortRepository = DBHelper.getRepository(SshPortDB);
                    const aport = await sshPortRepository.findOne({
                        where: {
                            ssh_user_id: user.id
                        }
                    });

                    if (aport) {
                        this._forwardPort = {
                            port: aport.port,
                            type: aport.forwardType === 'R' ? SshClientForwardType.R : SshClientForwardType.L,
                            destination: aport.destinationAddress
                        };

                        ctx.accept();
                        return;
                    }

                    Logger.getLogger().error(`SshClient::_authentication: port not found in DB by id: ${user.id}`);
                } else {
                    Logger.getLogger().error('SshClient::_authentication: user password is wrong!');
                }
            } else {
                Logger.getLogger().warn(`SshClient::_authentication: user not found "${ctx.username}"!`);
            }
        } else {
            Logger.getLogger().warn(`SshClient::_authentication: method "${ctx.method}" not supproted!`);
        }

        ctx.reject();
    }

    /**
     * _ready
     * @protected
     */
    public _ready(): void {
        const self = this.getSelf();

        // register events by ready ------------------------------------------------------------------------------------

        this._clientConnection.on('session', (accept: () => Session) => {
            self._session(accept);
        });

        this._clientConnection.on('request', (
            accept: ((chosenPort?: number) => void) |
            undefined, reject: (() => void) |
            undefined, name: 'tcpip-forward' | 'cancel-tcpip-forward',
            info: TcpipBindInfo
        ) => {
            self._request(accept, reject, name, info);
        });

        this._clientConnection.on('tcpip', (accept, reject, info) => {
            self._tcpip(accept, reject, info);
        });
    }

    /**
     * _session
     * @param accept
     * @protected
     */
    protected _session(accept: () => Session): void {
        this._clientSession = accept();

        const self = this.getSelf();

        this._clientSession.on('shell', (shellAccept: () => ServerChannel) => {
            self._shell(shellAccept);
        });
    }

    /**
     * _shell
     * @param accept
     * @protected
     */
    public _shell(accept: () => ServerChannel): void {
        this._shellChannel = accept();
        this._shellChannel.write('FlyingFish Shell-Info (readonly):\n');
    }

    /**
     * logToClient
     * @param msg
     */
    public logToClient(msg: string): void {
        if (this._shellChannel) {
            this._shellChannel.write(msg);
            this._shellChannel.write('\n');
        }

        Logger.getLogger().info(`SshClientHander::logToClient:(${this._clientInfo.ip}): ${msg}`);
    }

    /**
     * getConnection
     */
    public getConnection(): Connection {
        return this._clientConnection;
    }

    /**
     * getInfo
     */
    public getInfo(): ClientInfo {
        return this._clientInfo;
    }

    /**
     * getUser
     */
    public getUser(): SshClientUser|undefined {
        return this._user;
    }

    /**
     * getForwardPort
     */
    public getForwardPort(): SshClientForwardPort|undefined {
        return this._forwardPort;
    }

    /**
     * _request
     * @param accept
     * @param reject
     * @param name
     * @param info
     * @protected
     */
    public _request(
        accept: ((chosenPort?: number) => void) | undefined,
        reject: (() => void) | undefined,
        name: 'tcpip-forward' | 'cancel-tcpip-forward',
        info: TcpipBindInfo
    ): void {
        if (name === 'tcpip-forward') {
            if (accept) {
                accept();
            }

            switch (this._forwardPort?.type) {
                case SshClientForwardType.R:
                    this._clientForward = new SshClientForwardR(this, info);
                    this._clientForward.start();
                    break;

                default:
                    Logger.getLogger().error('SshClient::_request: SshClientForward type/port not found!');
            }
        } else if (reject) {
            reject();
        }
    }

    /**
     * _tcpip
     * @param accept
     * @param reject
     * @param info
     */
    public _tcpip(
        accept: () => ServerChannel,
        reject: () => void,
        info: TcpipRequestInfo
    ): void {
        switch (this._forwardPort?.type) {
            case SshClientForwardType.L:
                this._clientForward = new SshClientForwardL(this, info);
                this._clientForward.start(accept, reject);
                break;

            default:
                reject();
        }
    }

    /**
     * close
     * @param hadError
     * @protected
     */
    public close(hadError: boolean): void {
        if (hadError) {
            Logger.getLogger().error('SshClient::_close: Client close with error!');
        }

        if (this._clientForward) {
            this._clientForward.close();

            Logger.getLogger().info('SshClient::_close: Close forward out server');
        }
    }

}