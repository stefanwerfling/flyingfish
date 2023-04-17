import net, {Socket} from 'net';
import {TcpipBindInfo} from 'ssh2';
import {SshClientForward} from './SshClientForward.js';

/**
 * SshClientForwardR
 * Server to Client
 * sample: ssh -R 3000:localhost:3000 ffadmin@ssh.mydomain.org -p 443
 */
export class SshClientForwardR extends SshClientForward {

    /**
     * forword server
     * @protected
     */
    protected _fserver: net.Server|null = null;

    /**
     * getSelf
     */
    public getSelf(): SshClientForwardR {
        return this;
    }

    /**
     * start
     */
    public start(): void {
        this._client.logToClient('SshClientForwardR::forwardOut: start');

        const self = this.getSelf();

        this._fserver = net.createServer((socket: Socket) => {
            self._serverConnection(socket);
        });

        // register events ---------------------------------------------------------------------------------------------

        this._fserver.listen(this._client.getForwardPort()?.port, () => {
            self._serverListen();
        });

        this._fserver.on('error', (err: Error) => {
            self._serverError(err);
        });
    }

    /**
     * _serverConnection
     * @param socket
     * @protected
     */
    public _serverConnection(socket: Socket): void {
        socket.on('error', (err) => {
            this._client.logToClient(`SshClientForwardR::socket: ${err}`);
        });

        const bindInfo = this._bindInfo as TcpipBindInfo;

        this._client.getConnection().forwardOut(
            bindInfo.bindAddr,
            bindInfo.bindPort,
            socket.remoteAddress!,
            socket.remotePort!,
            (
                err,
                upstream
            ) => {
                if (err) {
                    socket.end();

                    this._client.logToClient(`SshClientForwardR::forwardOut::callback: not working: ${err}`);
                    return;
                }

                upstream.pipe(socket).pipe(upstream);
                upstream.on('error', (errUp: any) => {
                    this._client.logToClient(`SshClientForwardR::forwardOut::callback::upstream: ${errUp}`);
                });
            }
        );
    }

    /**
     * _serverListen
     * @protected
     */
    public _serverListen(): void {
        const bindInfo = this._bindInfo as TcpipBindInfo;

        this._client.logToClient('SshClientForwardR::_serverListen: Listen start on Flyingfish ...');
        console.log(`Listening remote forward on port ${this._client.getForwardPort()?.port}->${bindInfo.bindPort} by userid: ${this._client.getUser()?.id}`);
    }

    /**
     * _serverError
     * @param err
     * @protected
     */
    public _serverError(err: Error): void {
        this._client.logToClient(`SshClientForwardR::_serverError: ${err.message}`);
    }

    /**
     * close
     */
    public close(): void {
        this._client.logToClient('SshClientForwardR::forwardOut: close');

        if (this._fserver) {
            this._fserver.close();
        }
    }

}