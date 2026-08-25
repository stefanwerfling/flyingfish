import {ServiceJobAbstract, Logger} from 'figtree';
import {GatewayIdentifierServiceDB, NatPortServiceDB, NginxListenServiceDB} from 'flyingfish_core';
import {NatStatus} from 'flyingfish_schemas';
import Ping from 'ping';
import {UpnpNatCache} from '../../inc/Cache/UpnpNatCache.js';
import {HimHIP} from '../../inc/HimHIP/HimHIP.js';
import {NewPortMappingOpts} from '../../inc/Net/UpnpNat/Mapping/NewPortMappingOpts.js';
import {UpnpNatClient} from '../../inc/Net/UpnpNat/UpnpNatClient.js';

/**
 * UpnpNatService
 *
 * Reconciles the configured NAT port mappings against the gateway (via UPnP)
 * once a minute. Migrated onto figtree's `ServiceJobAbstract`: the framework
 * owns the cron scheduling, tick timing, error handling, health and restart,
 * replacing the former hand-rolled `node-schedule` job.
 *
 * Conditionally registered by `FlyingFishBackend` only when
 * `config.upnpnat.enable` is set (the former `main.ts` gated the start the same
 * way). Depends on the `mariadb` service; the mappings also require HimHIP
 * gateway data, which `update()` skips gracefully when not yet available.
 */
export class UpnpNatService extends ServiceJobAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'upnpnat';

    /**
     * Constructor.
     */
    public constructor() {
        super(UpnpNatService.NAME, [ 'mariadb' ]);
        this._cron = '*/1 * * * *';
    }

    /**
     * _setNatPortStatus
     * @param status
     * @param natId
     * @protected
     */
    protected async _setNatPortStatus(status: NatStatus, natId: number): Promise<void> {
        await NatPortServiceDB.getInstance().updateStatus(natId, status);
    }

    /**
     * update
     */
    public async update(): Promise<void> {
        try {
            UpnpNatCache.getInstance().reset();

            const himhip = HimHIP.getData();

            // reset all status ----------------------------------------------------------------------------------------

            await NatPortServiceDB.getInstance().resetAllStatus();

            // map -----------------------------------------------------------------------------------------------------

            if (himhip) {
                const gatewayId = await GatewayIdentifierServiceDB.getInstance().findByMac(himhip.gatewaymac);

                if (gatewayId) {
                    const nats = await NatPortServiceDB.getInstance().findAllByGatewayIdentifier(gatewayId.id);

                    if (nats) {
                        for await (const anat of nats) {
                            const res = await Ping.promise.probe(anat.gateway_address);

                            if (res.alive) {
                                const client = new UpnpNatClient({
                                    gatewayAddress: anat.gateway_address
                                });

                                try {
                                    const mappings = await client.getMappings();

                                    UpnpNatCache.getInstance().addGatewayMappings(
                                        `${gatewayId.mac_address}-${anat.gateway_address}`,
                                        UpnpNatCache.convertMapping(mappings)
                                    );
                                } catch (et) {
                                    Logger.getLogger().info('UpnpNatService::update: Gateway mapping info error/empty');
                                }

                                const options: NewPortMappingOpts = {
                                    description: anat.description,
                                    clientAddress: anat.client_address,
                                    public: anat.public_port,
                                    private: anat.private_port,
                                    ttl: anat.ttl,
                                    protocol: anat.protocol
                                };

                                try {
                                    if (anat.use_himhip_host_address) {
                                        options.clientAddress = himhip.hostip;
                                    }

                                    if (anat.listen_id > 0) {
                                        const alisten = await NginxListenServiceDB.getInstance().findOne(anat.listen_id);

                                        if (alisten) {
                                            options.private = alisten.listen_port;

                                            if (alisten.disable) {
                                                Logger.getLogger().info(
                                                    'UpnpNatService::update: Listen (%d, %s) is disable, skip to next ...',
                                                    alisten.listen_port,
                                                    alisten.description
                                                );

                                                await this._setNatPortStatus(NatStatus.inactive, anat.id);
                                                continue;
                                            }
                                        }
                                    }

                                    const map = await client.createMapping(options);

                                    if (map) {
                                        Logger.getLogger().info(
                                            'UpnpNatService::update: Port mapping create %s:%d -> %s:%s',
                                            anat.gateway_address,
                                            anat.public_port,
                                            options.clientAddress,
                                            options.private
                                        );

                                        await this._setNatPortStatus(NatStatus.ok, anat.id);
                                    } else {
                                        await this._setNatPortStatus(NatStatus.error, anat.id);
                                    }
                                } catch (ex) {
                                    Logger.getLogger().info(
                                        'UpnpNatService::update: Port mapping faild %s:%d -> %s:%s',
                                        anat.gateway_address,
                                        anat.public_port,
                                        options.clientAddress,
                                        options.private
                                    );

                                    let message = 'unknown';

                                    if (typeof ex === 'string') {
                                        message = ex;
                                    } else if (ex instanceof Error) {
                                        message = ex.message;
                                    }

                                    Logger.getLogger().info('UpnpNatService::update: error: %s', message);

                                    await this._setNatPortStatus(NatStatus.error, anat.id);
                                }
                            } else {
                                Logger.getLogger().info('UpnpNatService::update: Gateway \'%s\' unreachable, skip ahead ...', anat.gateway_address);

                                await this._setNatPortStatus(NatStatus.error, anat.id);
                            }
                        }
                    } else {
                        Logger.getLogger().info('UpnpNatService::update: Upnp-Nat list is empty by Gateway Identifier: %d', gatewayId.id);
                    }
                } else {
                    Logger.getLogger().info('UpnpNatService::update: Gateway identifier not found by mac: %s', himhip.gatewaymac);
                }
            } else {
                Logger.getLogger().info('UpnpNatService::update: HimHip service is not ready, skip upnpnat service ...');
            }
        } catch (e) {
            Logger.getLogger().error(e);
        }
    }

    /**
     * Scheduled execution (invoked by the cron tick).
     * @protected
     */
    protected override async _execute(): Promise<void> {
        await this.update();
    }

}