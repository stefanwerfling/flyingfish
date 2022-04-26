import {Context, ContextNames} from './Context';
import {Map as NginxMap} from './Map';
import {Server} from './Server';
import {Upstream} from './Upstream';

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
        let buffer = this._createContent(`${this._name} {\n`, index);

        buffer += this._generateStr();
        buffer += Context.contextsToStr(this._upstreams, index + 1);
        buffer += Context.contextsToStr(this._maps, index + 1);
        buffer += Context.contextsToStr(this._servers, index + 1);

        return buffer + this._createContent('}\n', index);
    }

}