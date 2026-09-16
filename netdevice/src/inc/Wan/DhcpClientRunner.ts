import {Logger} from '@stefanwerfling/figtree';
import {parseUdhcpcLease, WanLeaseFields} from 'flyingfish_core';
import {ChildProcess, spawn} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Markers the hook script wraps its environment dump in, so the runner can extract one
 * lease event from udhcpc's stdout.
 */
const BEGIN = '___FFLEASE_BEGIN___';
const END = '___FFLEASE_END___';

/**
 * Runs the WAN DHCP client (`udhcpc`) on the WAN interface and surfaces each obtained
 * lease (Pi-router epic, Phase 3). udhcpc invokes a `-s` hook on each event; the hook
 * dumps its environment between markers, which the runner parses (via
 * {@link parseUdhcpcLease}) on `bound`/`renew` and hands to `onLease`. Runs in the
 * ff-wan privileged (NET_ADMIN, host-net) container. The real DHCP exchange is only
 * verifiable on the Pi.
 */
export class DhcpClientRunner {

    private readonly _iface: string;

    private readonly _onLease: (lease: WanLeaseFields) => void;

    private _process: ChildProcess | null = null;

    private _scriptPath = '';

    private _buffer = '';

    private _collecting = false;

    private _event = '';

    private _env: Record<string, string> = {};

    /**
     * @param iface - the WAN interface to run udhcpc on
     * @param onLease - called with each obtained (bound/renew) lease
     */
    public constructor(iface: string, onLease: (lease: WanLeaseFields) => void) {
        this._iface = iface;
        this._onLease = onLease;
    }

    /**
     * The interface this runner is bound to.
     */
    public get iface(): string {
        return this._iface;
    }

    /**
     * Start udhcpc in the foreground with the env-dump hook, wiring its stdout to the
     * lease parser. Restarts udhcpc if it exits.
     */
    public start(): void {
        this._scriptPath = DhcpClientRunner._writeHookScript();

        this._process = spawn('udhcpc', ['-f', '-i', this._iface, '-s', this._scriptPath], {stdio: ['ignore', 'pipe', 'pipe']});

        this._process.stdout?.on('data', (chunk: Buffer): void => this._onStdout(chunk.toString()));
        this._process.stderr?.on('data', (chunk: Buffer): void => {
            Logger.getLogger().silly(`udhcpc(${this._iface}): ${chunk.toString().trim()}`);
        });

        this._process.on('error', (error: Error): void => {
            Logger.getLogger().error(`ff-wan: udhcpc failed to start on ${this._iface}`, error);
        });

        this._process.on('close', (code: number | null): void => {
            Logger.getLogger().warn(`ff-wan: udhcpc on ${this._iface} exited (code ${code}); restarting in 5s`);
            this._process = null;
            setTimeout((): void => this.start(), 5000).unref();
        });
    }

    /**
     * Stop udhcpc.
     */
    public stop(): void {
        if (this._process !== null) {
            this._process.removeAllListeners('close');
            this._process.kill();
            this._process = null;
        }
    }

    /**
     * Feed a stdout chunk through the line-oriented marker parser.
     * @param chunk - the stdout text
     */
    private _onStdout(chunk: string): void {
        this._buffer += chunk;
        const lines = this._buffer.split('\n');
        this._buffer = lines.pop() ?? '';

        for (const line of lines) {
            this._onLine(line);
        }
    }

    /**
     * Process one complete stdout line, assembling a lease from a marked env block.
     * @param line - the line (no trailing newline)
     */
    private _onLine(line: string): void {
        if (line.startsWith(BEGIN)) {
            this._collecting = true;
            this._event = line.slice(BEGIN.length).trim();
            this._env = {};

            return;
        }

        if (line.startsWith(END)) {
            this._collecting = false;

            if (this._event === 'bound' || this._event === 'renew') {
                this._onLease(parseUdhcpcLease(this._env));
            }

            return;
        }

        if (this._collecting) {
            const eq = line.indexOf('=');

            if (eq > 0) {
                this._env[line.slice(0, eq)] = line.slice(eq + 1);
            }
        }
    }

    /**
     * Write the udhcpc hook script that dumps its environment between markers.
     */
    private static _writeHookScript(): string {
        const scriptPath = path.join(os.tmpdir(), 'ff-wan-udhcpc.sh');
        const script = `#!/bin/sh\necho "${BEGIN} $1"\nenv\necho "${END}"\n`;

        fs.writeFileSync(scriptPath, script, {mode: 0o755});

        return scriptPath;
    }

}