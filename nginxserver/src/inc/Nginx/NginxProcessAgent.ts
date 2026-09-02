import {ChildProcess, exec, spawn} from 'child_process';
import {Logger} from 'figtree';

/**
 * NginxProcessAgent
 *
 * Runs and controls the local nginx binary inside the nginx container. This is
 * the process-control half that used to live in the backend's `NginxServer`,
 * moved next to nginx now that it runs in its own container (9.2.2). The backend
 * still writes the config to the shared volume and triggers reload/test through
 * the control HTTP server; the config is NOT generated here.
 */
export class NginxProcessAgent {

    /**
     * nginx binary command
     * @protected
     */
    protected _command: string = 'nginx';

    /**
     * path to the generated nginx.conf (shared volume)
     * @protected
     */
    protected _config: string;

    /**
     * nginx prefix path (shared volume)
     * @protected
     */
    protected _prefix: string;

    /**
     * the running nginx master process
     * @protected
     */
    protected _process: ChildProcess | null = null;

    /**
     * constructor
     * @param {string} config
     * @param {string} prefix
     */
    public constructor(config: string, prefix: string) {
        this._config = config;
        this._prefix = prefix;
    }

    /**
     * Build the nginx CLI arguments (config + prefix), mirroring the backend's
     * former NginxServer.
     * @returns {string[]}
     * @protected
     */
    protected _getArguments(): string[] {
        return [
            '-c', this._config,
            '-p', `${this._prefix}/servers`,
            '-g', 'error_log stderr notice;'
        ];
    }

    /**
     * Pipe a child process' stdout/stderr into the logger.
     * @param {ChildProcess} process
     * @protected
     */
    protected _pipeLogs(process: ChildProcess): void {
        process.stdout?.on('data', (buf: Buffer): void => {
            for (const entry of buf.toString().split('\n')) {
                if (entry.trim() !== '') {
                    Logger.getLogger().info('NginxProcessAgent::stdout: %s', entry);
                }
            }
        });

        process.stderr?.on('data', (buf: Buffer): void => {
            for (const entry of buf.toString().split('\n')) {
                if (entry.trim() !== '') {
                    Logger.getLogger().error('NginxProcessAgent::stderr: %s', entry);
                }
            }
        });
    }

    /**
     * Start the nginx master process (daemon off).
     */
    public start(): void {
        const args = this._getArguments();

        Logger.getLogger().silly('NginxProcessAgent::start: %s %s', this._command, args.join(' '));

        this._process = spawn(this._command, args);
        this._pipeLogs(this._process);
    }

    /**
     * Stop the nginx process.
     */
    public stop(): void {
        spawn(this._command, ['-s', 'stop']);
    }

    /**
     * Reload the nginx process (re-reads the config written to the shared volume).
     */
    public reload(): void {
        const args = this._getArguments();
        args.push('-s', 'reload');

        const process = spawn(this._command, args);
        this._pipeLogs(process);
    }

    /**
     * Test the current config with `nginx -t`.
     * @returns {Promise<boolean>}
     */
    public testConfig(): Promise<boolean> {
        return new Promise<boolean>((resolve): void => {
            exec(`${this._command} -t -c ${this._config}`, (error): void => {
                resolve(error === null);
            });
        });
    }

    /**
     * Whether the nginx master process is running.
     * @returns {boolean}
     */
    public isRun(): boolean {
        return this._process !== null && this._process.exitCode === null;
    }

}