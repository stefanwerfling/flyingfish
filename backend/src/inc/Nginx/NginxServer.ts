import {ChildProcess, exec, spawn} from 'child_process';
import {Logger} from 'figtree';
import * as fs from 'fs';
import path from 'path';
import {NginxConfig} from './NginxConfig.js';
import {NginxControlClient} from './NginxControlClient.js';

/**
 * NginxServerRemoteOptions
 *
 * When set, nginx runs in its own container (9.2.2): start/stop/reload/test go
 * to the control agent at `url` (authed with `secret`) instead of spawning nginx
 * locally. The config is still written here (to the shared volume).
 */
export type NginxServerRemoteOptions = {
    url: string;
    secret: string;
};

/**
 * NginxServerOptions
 */
export type NginxServerOptions = {
    config?: string;
    prefix?: string;
    remote?: NginxServerRemoteOptions;
};

/**
 * NginxServer
 */
export class NginxServer {

    /**
     * Prefix default path
     */
    public static NGINX_PREFIX_PATH = '/opt/flyingfish/nginx';

    /**
     * ngnix server instance
     * @private
     */
    private static _instance: NginxServer|null = null;

    /**
     * options
     * @param options
     */
    public static getInstance(options: NginxServerOptions|null = null): NginxServer {
        if (NginxServer._instance === null) {
            // default for my docker images
            let toptions: NginxServerOptions = {
                config: '/opt/flyingfish/nginx/nginx.conf',
                prefix: NginxServer.NGINX_PREFIX_PATH
            };

            if (options !== null) {
                toptions = options!;
            }

            NginxServer._instance = new NginxServer(toptions);
        }

        return NginxServer._instance;
    }

    /**
     * command
     * @protected
     */
    protected _command: string = 'nginx';

    /**
     * options
     * @protected
     */
    protected _options: NginxServerOptions;

    /**
     * configs
     * @protected
     */
    protected _config: NginxConfig|null = null;

    /**
     * process of ngnix
     * @protected
     */
    protected _process: ChildProcess|null = null;

    /**
     * Control client when nginx runs remotely (its own container); null in the
     * local-spawn mode.
     * @protected
     */
    protected _client: NginxControlClient|null = null;

    /**
     * constructor
     * @param options
     */
    public constructor(options: NginxServerOptions = {}) {
        if (options.prefix && !fs.existsSync(options.prefix)) {
            throw new Error(`prefix path: ${options.prefix} does not exist`);
        }

        if (options.remote) {
            this._client = new NginxControlClient(options.remote.url, options.remote.secret);
        }

        if (options.config) {
            this._config = new NginxConfig(options.config!);

            // set defaults
            this._config.setPid(`${options.prefix}/nginx.pid`);
            this._config.setErrorLog(`${options.prefix}/logs/error.log`);
            this._config.addVariable('daemon', 'off');

            this._config.create();

            if (!fs.existsSync(options.config)) {
                throw new Error(`config path: ${options.config} does not exist`);
            }
        }

        this._options = options;

    }

    /**
     * _getArguments
     * @protected
     */
    protected _getArguments(): any[] {
        const args = [];

        const {config, prefix} = this._options;

        if (config) {
            args.push('-c', config);
        }

        if (prefix) {
            args.push('-p', `${prefix}/servers`);
        }

        args.push('-g', 'error_log stderr notice;');

        return args;
    }

    /**
     * getConf
     */
    public getConf(): NginxConfig|null {
        return this._config;
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        if (this._config) {
            this._config.create();
        }

        if (this._client) {
            await this._client.start();

            return;
        }

        const args = this._getArguments();

        Logger.getLogger().silly('NginxServer::start: start nginx with: %s %s', this._command, args.join(' '));

        this._process = spawn(this._command, args);

        this._process.stdout!.on('data', (buf) => {
            const logs = buf.toString().split('\n');

            for (const entry of logs) {
                if (entry.trim() !== '') {
                    Logger.getLogger().info('NginxServer::stdout: %s', entry);
                }
            }
        });

        this._process.stderr!.on('data', (buf) => {
            const logs: string[] = buf.toString().split('\n');

            for (const entry of logs) {
                if (entry.trim() !== '') {
                    Logger.getLogger().error('NginxServer::stderr: %s', entry);
                }
            }
        });
    }

    /**
     * isRun
     */
    public async isRun(): Promise<boolean> {
        if (this._client) {
            return this._client.status();
        }

        if (this._process) {
            if (this._process.exitCode === null) {
                return true;
            }
        }

        return false;
    }

    /**
     * stop
     */
    public async stop(): Promise<void> {
        if (this._client) {
            await this._client.stop();

            return;
        }

        spawn(this._command, ['-s', 'stop']);
    }

    /**
     * reload
     */
    public async reload(): Promise<void> {
        if (this._config) {
            this._config.create();
        }

        if (this._client) {
            await this._client.reload();

            return;
        }

        const args = this._getArguments();
        args.push('-s', 'reload');

        this._process = spawn(this._command, args);

        this._process.stdout!.on('data', (buf) => {
            const logs = buf.toString().split('\n');

            for (const entry of logs) {
                Logger.getLogger().info(entry);
            }
        });

        this._process.stderr!.on('data', (buf) => {
            const logs = buf.toString().split('\n');

            for (const entry of logs) {
                Logger.getLogger().error(entry);
            }
        });
    }

    /**
     * testConfig
     */
    public async testConfig(): Promise<boolean> {
        if (this._client) {
            return this._client.testConfig();
        }

        const out = exec(`${this._command} -t`);

        return out.exitCode === 0;
    }

    /**
     * Return the web root path
     * @returns {string}
     */
    public getWebRootPath(): string {
        const prefix = this._options.prefix || NginxServer.NGINX_PREFIX_PATH;

        return path.join(prefix, 'html/');
    }

    /**
     * Return the well-known path
     * @returns {string}
     */
    public getWellKnownPath(): string {
        return path.join(this.getWebRootPath(), '.well-known/');
    }

    /**
     * getPagesPath
     */
    public getPagesPath(): string {
        const prefix = this._options.prefix || NginxServer.NGINX_PREFIX_PATH;

        return path.join(prefix, 'pages');
    }

}