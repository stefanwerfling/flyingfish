import {ServiceAbstract, Logger} from 'figtree';
import {ServiceImportance, ServiceStatus} from 'figtree-schemas';
import {resolveNginxControlUnixSocketPath} from 'flyingfish_core';
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
     * Control server for ip checks. Only created in local nginx mode — in
     * remote mode the equivalent server runs in the nginx container itself
     * (nginxserver's NjsControlHttpServer), so there's nothing to host here.
     * @private
     */
    private _control: NginxControlHttpServer | null = null;

    /**
     * Pre-resolved control-socket path used in remote nginx mode, where no
     * local control server runs but the generated nginx config still needs
     * the (identical, shared-socket-name) control URL.
     * @private
     */
    private _remoteControlSocket: {getUnixSocket(): string;} | null = null;

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
     * Fault-isolation importance: nginx is the reverse proxy, so the service
     * monitor should health-check it and restart it on failure.
     * @protected
     */
    protected override readonly _importance: ServiceImportance = ServiceImportance.Important;

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
        await this._configBuilder.build(this._accessLog.getServer(), this._control ?? this._remoteControlSocket);
    }

    /**
     * Start the control server — only in local nginx mode. In remote mode the
     * njs control server runs in the nginx container instead, so we just
     * pre-resolve the (shared-name) socket path for the config generator.
     * @param {string} prefix
     * @param {boolean} remote
     * @protected
     */
    protected async _startControl(prefix: string, remote: boolean): Promise<void> {
        if (remote) {
            const path = resolveNginxControlUnixSocketPath(prefix);
            this._remoteControlSocket = {getUnixSocket: (): string => path};
            return;
        }

        this._control = new NginxControlHttpServer();
        await this._control.listen();
    }

    /**
     * Close the control server.
     * @protected
     */
    protected async _closeControl(): Promise<void> {
        this._remoteControlSocket = null;

        if (this._control) {
            this._control.close();
            this._control = null;
        }
    }

    /**
     * Release still-open sub-servers so start() is safe to call as a restart.
     * The service monitor re-invokes start() on an unhealthy service WITHOUT a
     * prior stop(); the unhealthy trigger is a dead nginx process (isRun()
     * false), so nginx is already gone and only the control + access-log servers
     * stay alive and would collide on re-listen. Both closes are null-guarded,
     * so this is a no-op on the initial start.
     * @protected
     */
    protected async _releaseRunningServers(): Promise<void> {
        await this._closeControl();
        await this._accessLog.close();
    }

    /**
     * Start the nginx subsystem.
     */
    public override async start(): Promise<void> {
        this._status = ServiceStatus.Progress;

        // Restart-safe: drop any sub-servers left over from a previous start
        // before re-acquiring their ports (no-op on the initial start).
        await this._releaseRunningServers();

        // Configure the NginxServer singleton with the config path/prefix from
        // the loaded configuration before anything touches it (the former
        // `main.ts` did this right before starting the service). The
        // sub-components only read `NginxServer.getInstance()` inside methods,
        // so doing it here — the first thing in start() — is early enough.
        const nginxConfig = FlyingFishConfig.getInstance().get()?.nginx;
        const isRemote = Boolean(nginxConfig?.remote_url && nginxConfig?.secret);

        if (nginxConfig) {
            NginxServer.getInstance({
                config: nginxConfig.config,
                prefix: nginxConfig.prefix,
                // When a remote agent URL + secret are configured, nginx runs in
                // its own container and the process control goes through the agent.
                remote: isRemote ? {
                    url: nginxConfig.remote_url!,
                    secret: nginxConfig.secret!
                } : undefined
            });
        }

        this._accessLog.start();
        await this._startControl(nginxConfig?.prefix ?? '', isRemote);
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

        await this._process.stop(forced);

        await this._closeControl();
        await this._accessLog.close();

        this._status = ServiceStatus.None;
    }

    /**
     * Health check for the service monitor: healthy while the nginx process is
     * running (it is a separate binary that can die independently).
     * @returns {Promise<boolean>}
     */
    public override async healthCheck(): Promise<boolean> {
        return this._process.isRun();
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