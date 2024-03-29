import {Context, ContextNames} from './Context.js';
import {Listen} from './Listen.js';
import {Location} from './Location.js';

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
 * ServerXFrameOptions
 */
export enum ServerXFrameOptions {
    none = '',
    sameorigin = 'SAMEORIGIN',
    deny = 'DENY'
}

/**
 * ServerErrorPage
 */
export type ServerErrorPage = {
    code: string;
    uri: string;
};

/**
 * Server
 */
export class Server extends Context {

    /**
     * listens
     * @protected
     */
    protected _listens: Listen[] = [];

    /**
     * server name
     * @protected
     */
    protected _serverName: string = '';

    /**
     * root dir
     * @protected
     */
    protected _rootDir: string | null = null;

    /**
     * error pages
     * @protected
     */
    protected _errorPages: ServerErrorPage[] = [];

    /**
     * locations
     * @protected
     */
    protected _locations: Location[] = [];

    /**
     * context list
     * @protected
     */
    protected _contextList: Context[] = [];

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
        return undefined;
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
    public getRootDir(): string | null {
        return this._rootDir;
    }

    /**
     * addListen
     * @param listen
     */
    public addListen(listen: Listen): void {
        this._listens.push(listen);
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
    public setAccessLog(
        logfile: string,
        level: ServerLogLevel | string = ServerLogLevel.none
    ): void {
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
    public setErrorLog(
        logfile: string,
        level: ServerLogLevel | string = ServerLogLevel.none
    ): void {
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
    public setReturn(code: number | string): void {
        this._variables.set('return', `${code}`);
    }

    /**
     * addErrorPage
     * @param errorPage
     */
    public addErrorPage(errorPage: ServerErrorPage): void {
        this._errorPages.push(errorPage);
    }

    /**
     * addLocation
     * @param location
     */
    public addLocation(location: Location): void {
        this._locations.push(location);
    }

    /**
     * addContext
     * @param context
     */
    public addContext(context: Context): void {
        this._contextList.push(context);
    }

    /**
     * _generateStr
     * @param index
     * @protected
     */
    protected _generateStr(index: number = 0): string {
        let buffer = '';

        this._listens.forEach((listen) => {
            buffer += this._createContent(listen.generate(), index + 1);
        });

        buffer += super._generateStr(index);

        if (this._serverName !== '') {
            buffer += this._createContent(`server_name ${this._serverName};`, index + 1);
        }

        if (this._rootDir !== null) {
            buffer += this._createContent(`root ${this._rootDir};`, index + 1);
        }

        this._contextList.forEach((context) => {
            buffer += '\n';
            buffer += context.generate(index + 1);
        });

        if (this._errorPages.length > 0) {
            this._errorPages.forEach((value) => {
                buffer += this._createContent(`error_page ${value.code} ${value.uri};`, index + 1);
            });
        }

        return buffer;
    }

    /**
     * generate
     * @param index
     */
    public generate(index: number = 0): string {
        let buffer = this._createContent(`${this._name} {`, index);

        buffer += this._generateStr(index);
        buffer += Context.contextsToStr(this._locations, index + 1);

        return buffer + this._createContent('}', index);
    }

}