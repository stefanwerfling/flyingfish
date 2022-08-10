/**
 * HimHIPData
 */
export type HimHIPData = {
    gatewaymac: string;
    network: string;
    gateway: string;
    interface: string;
    hostip: string;
};

/**
 * HimHIP
 */
export class HimHIP {

    /**
     * data
     * @private
     */
    private static _data: HimHIPData|null = null;

    /**
     * getData
     */
    public static getData(): HimHIPData|null {
        return HimHIP._data;
    }

    /**
     * setData
     * @param data
     */
    public static setData(data: HimHIPData|null): void {
        HimHIP._data = data;
    }

}