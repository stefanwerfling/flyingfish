import {createRequire} from 'module';
import {Logger} from '@stefanwerfling/figtree';

const require = createRequire(import.meta.url);

/**
 * The native netfilter binding (`flyingfish_netfilternft`, Rust/rustables): programs the
 * host nftables ruleset over netlink + sets the forwarding sysctls from the resolved
 * router config (Pi-router epic, Phase 2). Requires CAP_NET_ADMIN + the host network
 * namespace.
 */
export type NetfilterNativeBinding = {
    applyRouter(wanInterface: string, lanInterfaces: string[], nat44: boolean, ipv6Mode: string, forward: boolean): void;
};

/**
 * Loads the optional native netfilter binding. The addon is a native module built for
 * the running platform, so it is an OPTIONAL dependency and loaded defensively: if it
 * is absent or not built, this returns null and the part runs (registers/pulls config)
 * without applying any ruleset, rather than crashing.
 */
export class NftBindingLoader {

    /**
     * Load the native netfilter binding, or null if it is unavailable.
     */
    public static load(): NetfilterNativeBinding | null {
        try {
            const addon = require('flyingfish_netfilternft') as Partial<NetfilterNativeBinding>;

            if (typeof addon.applyRouter !== 'function') {
                Logger.getLogger().error('netfilter: flyingfish_netfilternft exposes no applyRouter');

                return null;
            }

            return addon as NetfilterNativeBinding;
        } catch (error) {
            Logger.getLogger().error('netfilter: the native binding (flyingfish_netfilternft) could not be loaded', error);

            return null;
        }
    }

}