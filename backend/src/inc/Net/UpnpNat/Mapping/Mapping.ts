/**
 * UpnpNat Mapping type.
 */
export type Mapping = {
    public: {
        gateway: string;
        host: string;
        port: number;
    };
    private: {
        host: string;
        port: number;
    };
    protocol: string;
    enabled: boolean;
    description?: string;
    ttl: number;
    local: boolean;
};