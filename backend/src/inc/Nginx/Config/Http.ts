import {Context, ContextNames} from './Context.js';
import {Server} from './Server.js';

/**
 * Http
 */
export class Http extends Context {

    /**
     * pre servers, list of server before server directive
     * @protected
     */
    protected _preServers: Server[] = [];

    /**
     * servers, list of server
     * @protected
     */
    protected _servers: Server[] = [];

    /**
     * constructor
     */
    public constructor() {
        super(ContextNames.http);
    }

    /**
     * addServer
     * @param server
     */
    public addServer(server: Server): void {
        this._servers.push(server);
    }

    /**
     * generate
     * @param index
     */
    public generate(index: number = 0): string {
        let buffer = this._createContent(`${this._name} {`, index);

        buffer += this._generateStr();
        buffer += Context.contextsToStr(this._preServers, index + 1);
        buffer += Context.contextsToStr(this._servers, index + 1);

        return buffer + this._createContent('}', index);
    }

}