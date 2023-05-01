import {ChildProcess, exec, spawn} from 'child_process';
import {Logger} from 'flyingfish_core';
import * as fs from 'fs';
import {NginxConfig} from './NginxConfig.js';

/**
 * NginxServerOptions
 */
export type NginxServerOptions = {
    config?: string;
    prefix?: string;
};

/**
 * NginxServer
 */
export class NginxServer {

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
                config: '/opt/app/nginx/nginx.conf',
                prefix: '/opt/app/nginx'
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
     * constructor
     * @param options
     */
    public constructor(options: NginxServerOptions = {}) {
        if (options.prefix && !fs.existsSync(options.prefix)) {
            throw new Error(`prefix path: ${options.prefix} does not exist`);
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
    public start(): void {
        if (this._config) {
            this._config.create();
        }

        const args = this._getArguments();

        Logger.getLogger().silly(`NginxServer::start: start nginx with: ${this._command} ${args.join(' ')}`);

        this._process = spawn(this._command, args);

        this._process.stdout!.on('data', (buf) => {
            const logs = buf.toString().split('\n');

            for (const entry of logs) {
                if (entry.trim() !== '') {
                    Logger.getLogger().info(`NginxServer::stdout: ${entry}`);
                }
            }
        });

        this._process.stderr!.on('data', (buf) => {
            const logs = buf.toString().split('\n');

            for (const entry of logs) {
                if (entry.trim() !== '') {
                    Logger.getLogger().error(`NginxServer::stderr: ${entry}`);
                }
            }
        });
    }

    /**
     * isRun
     */
    public isRun(): boolean {
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
    public stop(): void {
        spawn(this._command, ['-s', 'stop']);
    }

    /**
     * reload
     */
    public reload(): void {
        if (this._config) {
            this._config.create();
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
        const out = exec(`${this._command} -t`);

        return out.exitCode === 0;
    }

}