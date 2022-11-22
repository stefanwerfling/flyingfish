import fs from 'fs';
import {Context} from './Config/Context.js';
import {Http} from './Config/Http.js';
import {Stream} from './Config/Stream.js';

/**
 * NginxConfigs
 */
export class NginxConfig {

    /**
     * conf file for nginx
     * @protected
     */
    protected _confFile: string;

    /**
     * modules
     * @protected
     */
    protected _modules: string[] = [];

    /**
     * nginx variables
     * @protected
     */
    protected _variables: Map<string, string|Context> = new Map<string, string|Context>();

    /**
     * http
     * @protected
     */
    protected _http: Http|null = null;

    /**
     * stream
     * @protected
     */
    protected _stream: Stream|null = null;

    /**
     * constructor
     * @param confFile
     */
    public constructor(confFile: string) {
        this._confFile = confFile;

        // set defaults ------------------------------------------------------------------------------------------------

        this._variables.set('worker_processes', 'auto');
        this._variables.set('pid', '');
        this._variables.set('error_log', '');

        // events block ------------------------------------------------------------------------------------------------
        const events = new Context('events');
        events.addVariable('worker_connections', '4096');

        this._variables.set(events.getName(), events);
    }

    /**
     * setPid
     * @param pidFile
     */
    public setPid(pidFile: string): void {
        this._variables.set('pid', pidFile);
    }

    /**
     * setErrorLog
     * @param errorLogFile
     */
    public setErrorLog(errorLogFile: string): void {
        this._variables.set('error_log', errorLogFile);
    }

    /**
     * addModule
     * @param module
     */
    public addModule(module: string): void {
        this._modules.push(module);
    }

    /**
     * addVariable
     * @param name
     * @param value
     */
    public addVariable(name: string, value: string|Context): void {
        this._variables.set(name, value);
    }

    /**
     * getHttp
     */
    public getHttp(): Http {
        if (this._http === null) {
            this._http = new Http();
        }

        return this._http;
    }

    /**
     * resetHttp
     */
    public resetHttp(): void {
        this._http = null;
    }

    /**
     * getStream
     */
    public getStream(): Stream {
        if (this._stream === null) {
            this._stream = new Stream();
        }

        return this._stream;
    }

    /**
     * resetStream
     */
    public resetStream(): void {
        this._stream = null;
    }

    /**
     * create conf file for nginx
     */
    public create(): string|null {
        let buffer = '';

        this._modules.forEach((value) => {
            buffer += `load_module ${value};\n`;
        });

        buffer += '\n';

        this._variables.forEach((value, key) => {
            if (typeof value === 'string') {
                buffer += `${key} ${value};\n`;
            } else {
                buffer += `\n${value.generate()}`;
            }
        });

        if (this._stream !== null) {
            buffer += '\n';
            buffer += this._stream.generate();
        }

        if (this._http !== null) {
            buffer += '\n';
            buffer += this._http.generate();
        }

        fs.writeFileSync(this._confFile, buffer, {flag: 'w+'});

        return this._confFile;
    }

}