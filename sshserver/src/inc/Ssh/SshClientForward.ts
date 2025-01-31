import {Logger} from 'flyingfish_core';
import {ServerChannel, TcpipBindInfo, TcpipRequestInfo} from 'ssh2';
import {SshClient} from './SshClient.js';

/**
 * ISshClientForward
 */
export interface ISshClientForward {

    /**
     * start
     */
    start(accept?: () => ServerChannel, reject?: () => void): void;

    /**
     * close
     */
    close(): void;
}

/**
 * SshClientForward
 */
export class SshClientForward implements ISshClientForward {

    /**
     * client
     * @protected
     */
    protected _client: SshClient;

    /**
     * bind info
     * @protected
     */
    protected _bindInfo: TcpipBindInfo|TcpipRequestInfo;

    /**
     * constructor
     * @param client
     * @param bindInfo
     */
    public constructor(client: SshClient, bindInfo: TcpipBindInfo|TcpipRequestInfo) {
        this._client = client;
        this._bindInfo = bindInfo;
    }

    /**
     * getSshClient
     */
    public getSshClient(): SshClient {
        return this._client;
    }

    /**
     * start
     * @param accept
     * @param reject
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public start(accept?: () => ServerChannel, reject?: () => void): void {
        Logger.getLogger().error('SshClientForward::start: Please overwrite start!');
    }

    /**
     * close
     */
    public close(): void {
        Logger.getLogger().error('SshClientForward::close: Please overwrite close!');
    }

}