import {Logger} from 'flyingfish_core';
import {NginxAccessLog} from '../inc/Nginx/NginxAccessLog.js';
import {NginxConfigBuilder} from '../inc/Nginx/NginxConfigBuilder.js';
import {NginxProcess} from '../inc/Nginx/NginxProcess.js';
import {NginxServer} from '../inc/Nginx/NginxServer.js';
import {NginxControlHttpServer} from '../inc/Server/NginxControlHttpServer.js';

/**
 * Coordinates the nginx subsystem: builds the config (NginxConfigBuilder), runs
 * the access-log pipeline (NginxAccessLog), the control server
 * (NginxControlHttpServer) and the nginx process (NginxProcess).
 */
export class NginxService {

    /**
     * Nginx service instance.
     * @member {NginxService|null}
     */
    private static _instance: NginxService | null = null;

    /**
     * Return an instance of the nginx service.
     * @returns {NginxService}
     */
    public static getInstance(): NginxService {
        if (NginxService._instance === null) {
            NginxService._instance = new NginxService();
        }

        return NginxService._instance;
    }

    /**
     * Access-log pipeline (syslog server -> InfluxDB).
     * @private
     */
    private _accessLog: NginxAccessLog = new NginxAccessLog();

    /**
     * Control server for ip checks.
     * @private
     */
    private _control: NginxControlHttpServer | null = null;

    /**
     * Config builder (database -> nginx config).
     * @private
     */
    private _configBuilder: NginxConfigBuilder = new NginxConfigBuilder();

    /**
     * Nginx binary lifecycle.
     * @private
     */
    private _process: NginxProcess = new NginxProcess();

    /**
     * Populate the shared NginxConfig from the database. The access-log and
     * control servers are passed to the builder so it can reference their
     * addresses.
     * @protected
     */
    private async _loadConfig(): Promise<void> {
        await this._configBuilder.build(this._accessLog.getServer(), this._control);
    }

    /**
     * Start the control server.
     * @protected
     */
    protected async _startControl(): Promise<void> {
        this._control = new NginxControlHttpServer();
        await this._control.listen();
    }

    /**
     * Close the control server.
     * @protected
     */
    protected async _closeControl(): Promise<void> {
        if (this._control) {
            this._control.close();
            this._control = null;
        }
    }

    /**
     * Start the nginx subsystem.
     */
    public async start(): Promise<void> {
        this._accessLog.start();
        await this._startControl();
        await this._loadConfig();
        await this._process.start();
    }

    /**
     * Stop the nginx subsystem.
     * @param {boolean} forced
     */
    public async stop(forced: boolean = false): Promise<void> {
        Logger.getLogger().info(`Nginx stop with forced: ${forced}`, {
            class: 'NginxService::stop'
        });

        this._process.stop(forced);

        await this._closeControl();
        await this._accessLog.close();
    }

    /**
     * Reload the nginx config and the process.
     */
    public async reload(): Promise<void> {
        await this._loadConfig();
        await this._process.reload();
    }

    /**
     * Build the current nginx config as a string from the database, without
     * writing any file or touching the nginx process. Used by the characterization
     * tests around the config generation (phase-2 split).
     * @returns {string}
     */
    public async generateConfig(): Promise<string> {
        await this._loadConfig();

        return NginxServer.getInstance().getConf()?.generate() ?? '';
    }

}