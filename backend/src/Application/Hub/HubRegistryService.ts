import {ServiceJobAbstract} from 'figtree';
import {ServiceImportance} from 'figtree-schemas';
import {HubRegistry} from './HubRegistry.js';

/**
 * HubRegistryService
 *
 * Boot-wired owner of the in-memory Hub registry (v2 modular architecture, DNS
 * pilot). Holds the single app-wide {@link HubRegistry} instance and runs a
 * periodic health sweep (online → degraded → offline) on the framework cron.
 *
 * It is a singleton keeper: the registry routes reach the same instance via
 * `HubRegistryService.getInstance().getRegistry()`. No database dependency - the
 * registry is purely in-memory. Transport (mTLS-WSS) and PKI cert verification
 * for part registration are later pilot stages.
 */
export class HubRegistryService extends ServiceJobAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'hubregistry';

    /**
     * Singleton instance.
     * @protected
     */
    protected static _instance: HubRegistryService | null = null;

    /**
     * The app-wide registry.
     * @protected
     */
    protected readonly _registry: HubRegistry = new HubRegistry();

    /**
     * Fault-isolation importance for the service monitor.
     * @protected
     */
    protected override readonly _importance: ServiceImportance = ServiceImportance.Important;

    /**
     * @returns {HubRegistryService}
     */
    public static getInstance(): HubRegistryService {
        if (!HubRegistryService._instance) {
            HubRegistryService._instance = new HubRegistryService();
        }

        return HubRegistryService._instance;
    }

    /**
     * Constructor.
     */
    public constructor() {
        super(HubRegistryService.NAME, []);
        this._cron = '*/1 * * * *';
    }

    /**
     * @returns {HubRegistry} the app-wide registry instance
     */
    public getRegistry(): HubRegistry {
        return this._registry;
    }

    /**
     * Periodic health sweep of the registered parts.
     * @protected
     */
    protected override async _execute(): Promise<void> {
        this._registry.evaluateHealth();
    }

}