import {Context, ContextNames} from './Context.js';
import {Map as NginxMap} from './Map.js';
import {Server} from './Server.js';
import {Upstream} from './Upstream.js';

/**
 * Stream
 */
export class Stream extends Context {

    /**
     * upstreams, list
     * @protected
     */
    protected _upstreams: Upstream[] = [];

    /**
     * maps, list
     * @protected
     */
    protected _maps: NginxMap[] = [];

    /**
     * servers, list of server
     * @protected
     */
    protected _servers: Server[] = [];

    /**
     * constructor
     */
    public constructor() {
        super(ContextNames.stream);
    }

    /**
     * addServer
     * @param server
     */
    public addServer(server: Server): void {
        this._servers.push(server);
    }

    /**
     * addUpstream
     * @param upstream
     */
    public addUpstream(upstream: Upstream): void {
        this._upstreams.push(upstream);
    }

    /**
     * hashUpstream
     * @param upstreamName
     */
    public hashUpstream(upstreamName: string): boolean {
        for (const aupstream of this._upstreams) {
            if (aupstream.getStreamName() === upstreamName) {
                return true;
            }
        }

        return false;
    }

    /**
     * addMap
     * @param amap
     */
    public addMap(amap: NginxMap): void {
        this._maps.push(amap);
    }

    /**
     * generate
     * @param index
     */
    public generate(index: number = 0): string {
        let buffer = this._createContent(`${this._name} {`, index);

        buffer += this._generateStr();
        buffer += Context.contextsToStr(this._upstreams, index + 1);
        buffer += Context.contextsToStr(this._maps, index + 1);
        buffer += Context.contextsToStr(this._servers, index + 1);

        return buffer + this._createContent('}', index);
    }

}