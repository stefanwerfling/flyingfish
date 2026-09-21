import {
    DhcpServerConfigEntry,
    NatPolicyEntry,
    NetworkInterfaceEntry,
    PortForwardEntry,
    RouterIdRequest,
    RouterOverviewResponse,
    SchemaDefaultReturn,
    SchemaRouterOverviewResponse
} from 'flyingfish_schemas';
import {Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch.js';
import {UnknownResponse} from './Error/UnknownResponse.js';

/**
 * Router — frontend API client for the Pi-router management endpoints (Pi-router epic,
 * Phase 6): the whole router config overview + saves for interfaces, the NAT policy and
 * the LAN DHCP config. All endpoints are RBAC-gated server-side.
 */
export class Router {

    /**
     * Read the whole router config (interfaces, NAT policy, DHCP config, leases, WAN lease).
     */
    public static async getOverview(): Promise<RouterOverviewResponse> {
        const result = await NetFetch.getData('/json/router/overview', SchemaRouterOverviewResponse);

        if (Vts.isUndefined(result)) {
            throw new UnknownResponse('Router overview returned empty!');
        }

        return result;
    }

    /**
     * Create/update a network interface (id 0 = create).
     * @param entry - the interface
     */
    public static async saveInterface(entry: NetworkInterfaceEntry): Promise<boolean> {
        await NetFetch.postData('/json/router/interface/save', entry, SchemaDefaultReturn);
        return true;
    }

    /**
     * Delete a network interface.
     * @param id - the interface id
     */
    public static async deleteInterface(id: number): Promise<boolean> {
        const request: RouterIdRequest = {id: id};
        await NetFetch.postData('/json/router/interface/delete', request, SchemaDefaultReturn);
        return true;
    }

    /**
     * Set the NAT/routing policy (singleton).
     * @param entry - the NAT policy
     */
    public static async saveNatPolicy(entry: NatPolicyEntry): Promise<boolean> {
        await NetFetch.postData('/json/router/nat/save', entry, SchemaDefaultReturn);
        return true;
    }

    /**
     * Set the LAN DHCP server config (singleton).
     * @param entry - the DHCP config
     */
    public static async saveDhcpConfig(entry: DhcpServerConfigEntry): Promise<boolean> {
        await NetFetch.postData('/json/router/dhcp/save', entry, SchemaDefaultReturn);
        return true;
    }

    /**
     * Create/update a port-forwarding / inbound firewall rule (id 0 = create).
     * @param entry - the rule
     */
    public static async savePortForward(entry: PortForwardEntry): Promise<boolean> {
        await NetFetch.postData('/json/router/portforward/save', entry, SchemaDefaultReturn);
        return true;
    }

    /**
     * Delete a port-forwarding / inbound firewall rule.
     * @param id - the rule id
     */
    public static async deletePortForward(id: number): Promise<boolean> {
        const request: RouterIdRequest = {id: id};
        await NetFetch.postData('/json/router/portforward/delete', request, SchemaDefaultReturn);
        return true;
    }

}