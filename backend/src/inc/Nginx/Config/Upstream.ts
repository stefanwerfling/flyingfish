import {Context, ContextNames} from './Context.js';

/**
 * Upstream load balancing algorithm
 */
export enum UpstreamLoadBalancingAlgorithm {
    none = 'none',
    least_conn = 'least_conn',
    ip_hash = 'ip_hash'
}

/**
 * Upstream Server
 */
export type UpstreamServer = {
    address: string;
    port: number;
    weight: number;
    max_fails: number;
    fail_timeout: number;
    unix_sock?: string;
};

/**
 * Upstream
 */
export class Upstream extends Context {

    /**
     * stream name
     * @protected
     */
    protected _streamName: string;

    /**
     * algorithm
     * @protected
     */
    protected _algorithm: UpstreamLoadBalancingAlgorithm = UpstreamLoadBalancingAlgorithm.none;

    /**
     * server
     * @protected
     */
    protected _server: UpstreamServer[] = [];

    /**
     * constructor
     * @param streamName
     */
    public constructor(streamName: string) {
        super(ContextNames.upstream);

        this._streamName = streamName;
    }

    /**
     * getStreamName
     */
    public getStreamName(): string {
        return this._streamName;
    }

    /**
     * setStreamName
     * @param name
     */
    public setStreamName(name: string): void {
        this._streamName = name;
    }

    /**
     * add server
     * @param server
     */
    public addServer(server: UpstreamServer): void {
        this._server.push(server);
    }

    /**
     * countServer
     */
    public countServer(): number {
        return this._server.length;
    }

    /**
     * setAlgorithm
     * @param algorithm
     */
    public setAlgorithm(algorithm: UpstreamLoadBalancingAlgorithm): void {
        this._algorithm = algorithm;
    }

    /**
     * _generateServers
     * @param index
     * @protected
     */
    protected _generateServers(index: number): string {
        let content = '';

        for (const aserver of this._server) {
            let serverStr = 'server ';

            if (aserver.unix_sock) {
                serverStr += `unix:${aserver.unix_sock}`;
            } else {
                serverStr += `${aserver.address}:${aserver.port}`;
            }

            if (aserver.weight > 0) {
                serverStr += ` weight=${aserver.weight}`;
            }

            if (aserver.max_fails > 0) {
                serverStr += ` max_fails=${aserver.max_fails}`;
            }

            if (aserver.fail_timeout > 0) {
                serverStr += ` fail_timeout=${aserver.fail_timeout}s`;
            }

            serverStr += ';';

            content += this._createContent(serverStr, index + 1);
        }

        return content;
    }

    /**
     * generate
     * @param index
     */
    public generate(index: number = 0): string {
        let buffer = this._createContent(`${this._name} ${this._streamName} {`, index);

        buffer += this._generateStr(index);

        // only use by more one server
        if (this._server.length > 1) {
            switch (this._algorithm) {
                case UpstreamLoadBalancingAlgorithm.ip_hash:
                    buffer += this._createContent(`${UpstreamLoadBalancingAlgorithm.ip_hash};`, index + 1);
                    break;

                case UpstreamLoadBalancingAlgorithm.least_conn:
                    buffer += this._createContent(`${UpstreamLoadBalancingAlgorithm.least_conn};`, index + 1);
                    break;
            }
        }

        buffer += this._generateServers(index);

        return buffer + this._createContent('}', index);
    }

}