import {SchemaErrors} from 'vts';
import {
    CapabilityManifest,
    CapabilityUiMenu,
    CapabilityUiPage,
    CapabilityUiWidget,
    SchemaCapabilityManifest
} from 'flyingfish_schemas';

/**
 * Health state of a registered part.
 */
export enum RegistryPartStatus {
    online = 'online',
    degraded = 'degraded',
    offline = 'offline'
}

/**
 * A part registered with the Hub: its manifest plus live health state.
 */
export type RegisteredPart = {
    manifest: CapabilityManifest;
    status: RegistryPartStatus;
    registeredAt: number;
    lastHeartbeat: number;
};

/**
 * Aggregated UI contributions of the online parts (feeds the dynamic frontend).
 */
export type UiContributions = {
    menu: CapabilityUiMenu[];
    pages: CapabilityUiPage[];
    widgets: CapabilityUiWidget[];
};

/**
 * Options for the Hub registry health thresholds.
 */
export type HubRegistryOptions = {
    degradedAfterMs?: number;
    offlineAfterMs?: number;
};

/**
 * In-memory Hub registry skeleton (v2 modular architecture, DNS pilot).
 *
 * Keeps the live directory of registered parts and their health state. This is
 * the transport-agnostic core of the Hub registry: it does NOT yet handle the
 * mTLS-WSS transport or PKI service-cert verification (later pilot stages) - it
 * only models register / heartbeat / bye, the online→degraded→offline state
 * machine, and the aggregation of UI contributions from online parts.
 *
 * The clock is injectable (the `now` parameters) so the health transitions are
 * deterministically testable.
 */
export class HubRegistry {

    /**
     * Registered parts keyed by their manifest part instanceId.
     * @protected
     */
    protected readonly _parts: Map<string, RegisteredPart> = new Map();

    /**
     * Age (ms) without a heartbeat after which a part is marked degraded.
     * @protected
     */
    protected readonly _degradedAfterMs: number;

    /**
     * Age (ms) without a heartbeat after which a part is marked offline.
     * @protected
     */
    protected readonly _offlineAfterMs: number;

    /**
     * @param {HubRegistryOptions} options
     */
    public constructor(options: HubRegistryOptions = {}) {
        this._degradedAfterMs = options.degradedAfterMs ?? 60000;
        this._offlineAfterMs = options.offlineAfterMs ?? 120000;
    }

    /**
     * Register (or re-register) a part from its capability manifest. Idempotent:
     * re-registering the same instanceId refreshes the manifest and heartbeat but
     * keeps the original registeredAt.
     * @param {CapabilityManifest} manifest
     * @param {number} now
     * @returns {RegisteredPart}
     */
    public register(manifest: CapabilityManifest, now: number = Date.now()): RegisteredPart {
        const errors: SchemaErrors = [];

        if (!SchemaCapabilityManifest.validate(manifest, errors)) {
            throw new Error(`HubRegistry::register: invalid manifest: ${JSON.stringify(errors)}`);
        }

        const existing = this._parts.get(manifest.part.instanceId);

        const part: RegisteredPart = {
            manifest: manifest,
            status: RegistryPartStatus.online,
            registeredAt: existing ? existing.registeredAt : now,
            lastHeartbeat: now
        };

        this._parts.set(manifest.part.instanceId, part);

        return part;
    }

    /**
     * Record a heartbeat for a part, bringing it back to online.
     * @param {string} instanceId
     * @param {number} now
     * @returns {boolean} true if the part is registered
     */
    public heartbeat(instanceId: string, now: number = Date.now()): boolean {
        const part = this._parts.get(instanceId);

        if (!part) {
            return false;
        }

        part.lastHeartbeat = now;
        part.status = RegistryPartStatus.online;

        return true;
    }

    /**
     * Remove a part (graceful shutdown / deregister).
     * @param {string} instanceId
     * @returns {boolean} true if the part was registered
     */
    public bye(instanceId: string): boolean {
        return this._parts.delete(instanceId);
    }

    /**
     * Re-evaluate the health state of every part from the heartbeat age.
     * @param {number} now
     */
    public evaluateHealth(now: number = Date.now()): void {
        for (const part of this._parts.values()) {
            const age = now - part.lastHeartbeat;

            if (age > this._offlineAfterMs) {
                part.status = RegistryPartStatus.offline;
            } else if (age > this._degradedAfterMs) {
                part.status = RegistryPartStatus.degraded;
            } else {
                part.status = RegistryPartStatus.online;
            }
        }
    }

    /**
     * @param {string} instanceId
     * @returns {RegisteredPart|undefined}
     */
    public get(instanceId: string): RegisteredPart | undefined {
        return this._parts.get(instanceId);
    }

    /**
     * @returns {RegisteredPart[]} all registered parts
     */
    public list(): RegisteredPart[] {
        return Array.from(this._parts.values());
    }

    /**
     * @returns {RegisteredPart[]} only the parts currently online
     */
    public listOnline(): RegisteredPart[] {
        return this.list().filter((part) => part.status === RegistryPartStatus.online);
    }

    /**
     * Aggregate the UI contributions (menu/pages/widgets) of the online parts,
     * with the menu ordered by its `order`.
     * @returns {UiContributions}
     */
    public uiContributions(): UiContributions {
        const menu: CapabilityUiMenu[] = [];
        const pages: CapabilityUiPage[] = [];
        const widgets: CapabilityUiWidget[] = [];

        for (const part of this.listOnline()) {
            for (const capability of part.manifest.capabilities) {
                const ui = capability.ui;

                if (!ui) {
                    continue;
                }

                if (ui.menu) {
                    menu.push(...ui.menu);
                }

                if (ui.pages) {
                    pages.push(...ui.pages);
                }

                if (ui.widgets) {
                    widgets.push(...ui.widgets);
                }
            }
        }

        menu.sort((a, b) => a.order - b.order);

        return {
            menu: menu,
            pages: pages,
            widgets: widgets
        };
    }

}