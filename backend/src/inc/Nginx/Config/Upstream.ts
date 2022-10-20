import {Context, ContextNames} from './Context';

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

            serverStr += `${aserver.address}:${aserver.port}`;

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

        if (this._algorithm !== UpstreamLoadBalancingAlgorithm.none) {
            buffer += this._createContent(`${this._algorithm};`, index + 1);
        }

        buffer += this._generateServers(index);

        return buffer + this._createContent('}', index);
    }

}