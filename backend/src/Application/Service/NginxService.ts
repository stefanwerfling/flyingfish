import {ServiceAbstract, Logger} from 'figtree';
import {ServiceStatus} from 'figtree-schemas';
import {FlyingFishConfig} from '../Config/FlyingFishConfig.js';
import {NginxAccessLog} from '../../inc/Nginx/NginxAccessLog.js';
import {NginxConfigBuilder} from '../../inc/Nginx/NginxConfigBuilder.js';
import {NginxProcess} from '../../inc/Nginx/NginxProcess.js';
import {NginxServer} from '../../inc/Nginx/NginxServer.js';
import {NginxControlHttpServer} from '../../inc/Server/NginxControlHttpServer.js';

/**
 * Coordinates the nginx subsystem: builds the config (NginxConfigBuilder), runs
 * the access-log pipeline (NginxAccessLog), the control server
 * (NginxControlHttpServer) and the nginx process (NginxProcess).
 *
 * Migrated onto figtree's `ServiceAbstract` as a lifecycle service: the
 * framework now owns start/stop, health and restart (its `stopAll()` on
 * shutdown replaces the former hand-wired `exitHook` in `main.ts`). Retains its
 * singleton accessor because the nginx reload route and `SslCertService` call
 * `NginxService.getInstance().reload()` on demand.
 *
 * Registered by `FlyingFishBackend` with a dependency on the `mariadb` service
 * (the config is generated from the database).
 */
export class NginxService extends ServiceAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'nginx';

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
     * Constructor.
     */
    public constructor() {
        super(NginxService.NAME, [ 'mariadb' ]);
    }

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
    public override async start(): Promise<void> {
        this._status = ServiceStatus.Progress;

        // Configure the NginxServer singleton with the config path/prefix from
        // the loaded configuration before anything touches it (the former
        // `main.ts` did this right before starting the service). The
        // sub-components only read `NginxServer.getInstance()` inside methods,
        // so doing it here — the first thing in start() — is early enough.
        const nginxConfig = FlyingFishConfig.getInstance().get()?.nginx;

        if (nginxConfig) {
            NginxServer.getInstance({
                config: nginxConfig.config,
                prefix: nginxConfig.prefix
            });
        }

        this._accessLog.start();
        await this._startControl();
        await this._loadConfig();
        await this._process.start();

        this._status = ServiceStatus.Success;
    }

    /**
     * Stop the nginx subsystem.
     *
     * Defaults to a forced stop: the service manager calls `stop()` with no
     * argument on shutdown, and the former `exitHook` stopped nginx forcibly
     * (`stop(true)`) — a graceful drain could otherwise stall shutdown until
     * the framework's timeout.
     * @param {boolean} forced
     */
    public override async stop(forced: boolean = true): Promise<void> {
        Logger.getLogger().info(`Nginx stop with forced: ${forced}`, {
            class: 'NginxService::stop'
        });

        this._process.stop(forced);

        await this._closeControl();
        await this._accessLog.close();

        this._status = ServiceStatus.None;
    }

    /**
     * Reload the nginx config and the process.
     */
    public override async reload(): Promise<void> {
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