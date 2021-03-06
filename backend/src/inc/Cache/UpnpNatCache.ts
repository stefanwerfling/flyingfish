import NodeCache from 'node-cache';

/**
 * UpnpNatCacheMapping
 */
export type UpnpNatCacheMapping = {
    public: {
      host: string;
      port: number;
    };
    private: {
        host: string;
        port: number;
    };
    protocol: string;
    enabled: boolean;
    description: string;
    ttl: number;
    local: boolean;
};

/**
 * UpnpNatCache
 */
export class UpnpNatCache {

    /**
     * instance
     * @private
     */
    private static _instance: UpnpNatCache|null = null;

    /**
     * getInstance
     */
    public static getInstance(): UpnpNatCache {
        if (UpnpNatCache._instance === null) {
            UpnpNatCache._instance = new UpnpNatCache();
        }

        return UpnpNatCache._instance;
    }

    /**
     * name
     * @protected
     */
    protected _name: string = 'upnpnat';

    /**
     * node cache
     * @protected
     */
    protected _cache: NodeCache;

    /**
     * constructor
     */
    public constructor() {
        this._cache = new NodeCache({
            stdTTL: 0,
            checkperiod: 0
        });
    }

    /**
     * reset
     */
    public reset(): void {
        this._cache.set(this._name, new Map<string, UpnpNatCacheMapping[]>());
    }

    /**
     * addGatewayMappings
     * @param deviceId
     * @param mappings
     */
    public addGatewayMappings(deviceId: string, mappings: UpnpNatCacheMapping[]): void {
        let list = this._cache.get<Map<string, UpnpNatCacheMapping[]>>(this._name);

        if (list === undefined) {
            list = new Map<string, UpnpNatCacheMapping[]>();
        }

        list.set(deviceId, mappings);

        this._cache.set(this._name, list);
    }

    /**
     * getLists
     */
    public getLists(): Map<string, UpnpNatCacheMapping[]> | undefined {
        return this._cache.get<Map<string, UpnpNatCacheMapping[]>>(this._name);
    }

}