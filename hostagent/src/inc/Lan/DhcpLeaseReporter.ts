import {DnsmasqLease} from 'flyingfish_core';

/**
 * The registry secret header the Hub authenticates service parts with.
 */
const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * A minimal fetch signature (injectable for tests).
 */
export type LanFetch = (url: string, init?: {method?: string; headers?: Record<string, string>; body?: string;}) => Promise<unknown>;

/**
 * Reports the active LAN DHCP leases ff-lan reads from dnsmasq back to the Hub
 * (Pi-router epic, Phase 4): POSTs the full lease set (a bulk replace) to
 * `/json/router/dhcp-leases`. Best-effort — a failed report is swallowed.
 */
export class DhcpLeaseReporter {

    private readonly _hubUrl: string;

    private readonly _secret: string;

    private readonly _fetch: LanFetch;

    /**
     * @param hubUrl - the Hub (backend) base url
     * @param secret - the registry shared secret
     * @param fetchImpl - optional fetch implementation (defaults to the global fetch)
     */
    public constructor(hubUrl: string, secret: string, fetchImpl?: LanFetch) {
        this._hubUrl = hubUrl.replace(/\/+$/u, '');
        this._secret = secret;
        this._fetch = fetchImpl ?? (fetch as unknown as LanFetch);
    }

    /**
     * Report the current leases (stamping each with the LAN interface). Returns true on
     * a successful POST, false on any error.
     * @param leases - the parsed dnsmasq leases
     * @param iface - the LAN interface the leases are on
     */
    public async report(leases: DnsmasqLease[], iface: string): Promise<boolean> {
        try {
            await this._fetch(`${this._hubUrl}/json/router/dhcp-leases`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    [HEADER_REGISTRY_SECRET]: this._secret
                },
                body: JSON.stringify({
                    interface: iface,
                    leases: leases.map((lease) => ({
                        mac_address: lease.mac_address,
                        ip_address: lease.ip_address,
                        hostname: lease.hostname,
                        expires: lease.expires,
                        interface: iface
                    }))
                })
            });

            return true;
        } catch {
            return false;
        }
    }

}