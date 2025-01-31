import net from 'net';
import {ServerChannel} from 'ssh2';
import {SshClientForwardType} from './SshClient.js';
import {SshClientForward} from './SshClientForward.js';

/**
 * SshClientForwardL
 * Client to Server
 * sample: ssh -L 3000:localhost:3000 ffadmin@ssh.mydomain.org -p 443
 */
export class SshClientForwardL extends SshClientForward {

    /**
     * forword client
     * @protected
     */
    protected _fclient: net.Socket|null = null;

    /**
     * getSelf
     */
    public getSelf(): SshClientForwardL {
        return this;
    }

    /**
     * getClientSocket
     */
    public getClientSocket(): net.Socket|null {
        return this._fclient;
    }

    /**
     * start
     * @param accept
     * @param reject
     */
    public start(accept?: () => ServerChannel|undefined, reject?: () => void): void {
        this._client.logToClient('SshClientForwardL::start: start');

        if (accept && reject) {
            const self = this.getSelf();
            const forwardPort = this._client.getForwardPort();

            if (!forwardPort || forwardPort!.type !== SshClientForwardType.L) {
                this._client.logToClient('SshClientForwardL::start: empty or wrong type for forward L!');
                return;
            }

            this._fclient = new net.Socket();

            let src: ServerChannel | undefined;

            this._fclient.on('connect', (): void => {
                src = accept();

                if (!src) {
                    self.getClientSocket()!.end();
                    return;
                }

                src.pipe(self.getClientSocket()!).pipe(src);
                self.getSshClient().logToClient('SshClientForwardL::start::connect: connected to destination.');
            });

            this._fclient.on('error', () => {
                if (!src) {
                    reject();
                }

                self.getSshClient().logToClient('SshClientForwardL::start::error: close connection to destination.');
            });

            this._fclient.on('close', () => {
                if (!src) {
                    reject();
                }

                self.getSshClient().logToClient('SshClientForwardL::start::close: close connection to destination.');
            });

            self.getSshClient().logToClient(`SshClientForwardL::start: connect to ${forwardPort!.destination!}:${forwardPort!.port!}`);

            this._fclient.connect(
                forwardPort!.port!,
                forwardPort!.destination!
            );
        }
    }

    /**
     * close
     */
    public close(): void {
        this._client.logToClient('SshClientForwardL::forwardOut: close');
    }

}