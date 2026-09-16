import {Logger} from '@stefanwerfling/figtree';
import {buildDnsmasqConfig, DnsmasqConfig, DnsmasqLease, parseDnsmasqLeases} from 'flyingfish_core';
import {ChildProcess, spawn} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Runs dnsmasq for the LAN DHCP/RA server (Pi-router epic, Phase 4): writes the
 * generated dnsmasq config to a file, runs `dnsmasq -C <conf> -k` (foreground, no
 * daemonize) and watches the lease file, parsing it (via {@link parseDnsmasqLeases}) on
 * every change and handing the current leases to `onLeases`. Runs in the ff-lan
 * privileged (NET_ADMIN, host-net) container. The real DHCP service is only verifiable
 * on the Pi.
 */
export class DnsmasqRunner {

    private readonly _config: DnsmasqConfig;

    private readonly _onLeases: (leases: DnsmasqLease[]) => void;

    private _process: ChildProcess | null = null;

    private _watching = false;

    /**
     * @param config - the resolved dnsmasq config (incl. the lease file path)
     * @param onLeases - called with the current lease set whenever the lease file changes
     */
    public constructor(config: DnsmasqConfig, onLeases: (leases: DnsmasqLease[]) => void) {
        this._config = config;
        this._onLeases = onLeases;
    }

    /**
     * The LAN interface this runner serves.
     */
    public get lanInterface(): string {
        return this._config.lanInterface;
    }

    /**
     * Whether this runner's config matches the given one (main uses it to decide whether
     * to restart on a config change).
     * @param config - the candidate config
     */
    public matches(config: DnsmasqConfig): boolean {
        return JSON.stringify(this._config) === JSON.stringify(config);
    }

    /**
     * Write the config + start dnsmasq, watching the lease file. A disabled/empty config
     * (no DHCP) starts nothing.
     */
    public start(): void {
        const conf = buildDnsmasqConfig(this._config);

        if (conf === '') {
            Logger.getLogger().info('ff-lan: DHCP disabled or no LAN interface — dnsmasq not started');

            return;
        }

        const confPath = path.join(os.tmpdir(), 'ff-lan-dnsmasq.conf');
        fs.writeFileSync(confPath, conf);

        this._process = spawn('dnsmasq', ['-C', confPath, '-k'], {stdio: ['ignore', 'ignore', 'pipe']});

        this._process.stderr?.on('data', (chunk: Buffer): void => {
            Logger.getLogger().silly(`dnsmasq(${this._config.lanInterface}): ${chunk.toString().trim()}`);
        });

        this._process.on('error', (error: Error): void => {
            Logger.getLogger().error(`ff-lan: dnsmasq failed to start on ${this._config.lanInterface}`, error);
        });

        this._process.on('close', (code: number | null): void => {
            Logger.getLogger().warn(`ff-lan: dnsmasq on ${this._config.lanInterface} exited (code ${code}); restarting in 5s`);
            this._process = null;
            setTimeout((): void => this.start(), 5000).unref();
        });

        this._watchLeases();
    }

    /**
     * Stop dnsmasq + the lease watcher.
     */
    public stop(): void {
        if (this._watching) {
            fs.unwatchFile(this._config.leaseFile);
            this._watching = false;
        }

        if (this._process !== null) {
            this._process.removeAllListeners('close');
            this._process.kill();
            this._process = null;
        }
    }

    /**
     * Watch the lease file and report the parsed leases on every change (+ once now).
     */
    private _watchLeases(): void {
        if (this._watching) {
            return;
        }

        this._watching = true;
        fs.watchFile(this._config.leaseFile, {interval: 5000}, (): void => this._readLeases());
        this._readLeases();
    }

    /**
     * Read + parse the lease file and hand the leases to the callback (best-effort).
     */
    private _readLeases(): void {
        fs.readFile(this._config.leaseFile, 'utf8', (error, content): void => {
            if (error) {
                return;
            }

            this._onLeases(parseDnsmasqLeases(content));
        });
    }

}