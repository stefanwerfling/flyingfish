import {Logger} from '@stefanwerfling/figtree';
import {buildNftablesRuleset, NftablesRouterConfig} from 'flyingfish_core';
import {NetfilterNativeBinding, NftBindingLoader} from './NftBindingLoader.js';

/**
 * Applies the resolved router config to the HOST network (Pi-router epic, Phase 2b)
 * via the native netfilter binding (`flyingfish_netfilternft`, Rust/rustables): the
 * binding programs the nftables ruleset over netlink + sets the forwarding sysctls.
 * Runs in the netfilter part's privileged (NET_ADMIN, host-net) container.
 *
 * The native `applyRouter` replaces the whole FlyingFish ruleset atomically per call,
 * so each reconcile deterministically converges to the config. The pure text ruleset
 * ({@link buildNftablesRuleset}) is logged at debug as a human-readable preview of what
 * the binding programs.
 */
export class NetfilterApplier {

    private readonly _binding: NetfilterNativeBinding | null;

    /**
     * @param binding - the native binding (defaults to the loaded `flyingfish_netfilternft`)
     */
    public constructor(binding?: NetfilterNativeBinding | null) {
        this._binding = binding === undefined ? NftBindingLoader.load() : binding;
    }

    /**
     * Whether the native binding is available (else apply is a logged no-op).
     */
    public isAvailable(): boolean {
        return this._binding !== null;
    }

    /**
     * Program the host nftables + forwarding sysctls for the given router config.
     * @param config - the resolved router config
     */
    public apply(config: NftablesRouterConfig): void {
        Logger.getLogger().silly(`netfilter: applying ruleset preview:\n${buildNftablesRuleset(config).ruleset}`);

        if (this._binding === null) {
            Logger.getLogger().warn('netfilter: native binding unavailable — ruleset NOT applied');

            return;
        }

        this._binding.applyRouter(config.wanInterface, config.lanInterfaces, config.nat44, config.ipv6Mode, config.forward);
    }

}