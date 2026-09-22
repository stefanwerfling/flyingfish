import {HimHIPData} from 'flyingfish_schemas';

export type onEventDataUpdate = (data: HimHIPData|null) => void;

/**
 * HimHIP — how is my host ip. An in-process store for this node's host/gateway facts
 * (hostip, gateway, interface, gatewaymac). The data is reported by the `netdevice` part
 * over HTTP (`POST /json/router/host-info`); the former Redis pub/sub transport was
 * removed. Consumers (UpnpNat, DynDns, the dashboard, the HTTP→HTTPS redirect host) read
 * {@link HimHIP.getData} / subscribe via {@link HimHIP.registerEvent}.
 */
export class HimHIP {

    /**
     * data
     * @private
     */
    private static _data: HimHIPData|null = null;

    /**
     * events
     * @private
     */
    private static _events: onEventDataUpdate[] = [];

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

        for (const event of HimHIP._events) {
            event(HimHIP._data);
        }
    }

    /**
     * Register an event
     * @param {onEventDataUpdate} event
     */
    public static registerEvent(event: onEventDataUpdate): void {
        HimHIP._events.push(event);
    }

}
