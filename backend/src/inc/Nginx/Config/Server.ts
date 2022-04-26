import {Context, ContextNames} from './Context';
import {Location} from './Location';

/**
 * ServerLogLevel
 */
export enum ServerLogLevel {
    none = '',
    warn = 'warn',
    error = 'error',
    crit = 'crit',
    alert = 'alert',
    emerg = 'emerg',
    debug = 'debug',
    standard = 'standard'
}

/**
 * Server
 */
export class Server extends Context {

    /**
     * server name
     * @protected
     */
    protected _serverName: string = '';

    /**
     * root dir
     * @protected
     */
    protected _rootDir: string|null = null;

    /**
     * locations
     * @protected
     */
    protected _locations: Location[] = [];

    /**
     * constructor
     * @param name
     */
    public constructor(name: string = '') {
        super(ContextNames.server);

        this._setDefaults();
        this.setServerName(name);
    }

    /**
     * set defaults
     * @protected
     */
    protected _setDefaults(): void {
        // set default
        this._variables.set('listen', '80');
    }

    /**
     * setServerName
     * @param name
     */
    public setServerName(name: string): void {
        this._serverName = name;
    }

    /**
     * setRootDir
     * @param dir
     */
    public setRootDir(dir: string): void {
        this._rootDir = dir;
    }

    /**
     * getRootDir
     */
    public getRootDir(): string|null {
        return this._rootDir;
    }

    /**
     * setListen
     * @param port
     * @param ip
     * @param isDefault
     */
    public setListen(
        port: string|number,
        ip: string|null = null,
        isDefault: boolean = false
    ): void {
        let buffer = `${port}`;

        if (ip !== null) {
            buffer = `${ip}:${port}`;
        }

        buffer += isDefault ? ' default_server' : '';

        this._variables.set('listen', buffer);
    }

    /**
     * setIndex
     * @param index
     */
    public setIndex(index: string): void {
        this._variables.set('index', index);
    }

    /**
     * setAccessLog
     * @param logfile
     * @param level
     */
    public setAccessLog(logfile: string, level: ServerLogLevel|string = ServerLogLevel.none): void {
        let buffer = `${logfile}`;

        if (level !== '') {
            buffer += ` ${level}`;
        }

        this._variables.set('access_log', buffer);
    }

    /**
     * setErrorLog
     * @param logfile
     * @param level
     */
    public setErrorLog(logfile: string, level: ServerLogLevel|string = ServerLogLevel.none): void {
        let buffer = `${logfile}`;

        if (level !== '') {
            buffer += ` ${level}`;
        }

        this._variables.set('error_log', buffer);
    }

    /**
     * setReturn
     * @param code
     */
    public setReturn(code: number|string): void {
        this._variables.set('return', `${code}`);
    }

    /**
     * _generateStr
     * @param index
     * @protected
     */
    protected _generateStr(index: number = 0): string {
        let buffer = super._generateStr(index + 1);

        if (this._serverName !== '') {
            buffer += this._createContent(`\tserver_name ${this._serverName};\n`, index + 1);
        }

        if (this._rootDir !== null) {
            buffer += this._createContent(`\troot ${this._rootDir};\n`, index + 1);
        }

        return buffer;
    }

    /**
     * generate
     * @param index
     */
    public generate(index: number = 0): string {
        let buffer = this._createContent(`${this._name} {\n`, index);

        buffer += this._generateStr(index);
        buffer += Context.contextsToStr(this._locations, index + 1);

        return buffer + this._createContent('}\n', index);
    }

}