import {Job, scheduleJob} from 'node-schedule';
import {UpnpNatCache} from '../Cache/UpnpNatCache';
import {GatewayIdentifier as GatewayIdentifierDB} from '../Db/MariaDb/Entity/GatewayIdentifier';
import {NatPort as NatPortDB} from '../Db/MariaDb/Entity/NatPort';
import {promise as PingPromise} from 'ping';
import {NginxListen as NginxListenDB} from '../Db/MariaDb/Entity/NginxListen';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {HimHIP} from '../HimHIP/HimHIP';
import {Logger} from '../Logger/Logger';
import {NewPortMappingOpts, UpnpNatClient} from '../Net/Upnp/UpnpNatClient';

/**
 * UpnpNatService
 */
export class UpnpNatService {

    /**
     * scheduler job
     * @protected
     */
    protected _scheduler: Job|null = null;

    /**
     * update
     */
    public async update(): Promise<void> {
        try {
            UpnpNatCache.getInstance().reset();

            const giRepository = MariaDbHelper.getRepository(GatewayIdentifierDB);
            const natportRepository = MariaDbHelper.getRepository(NatPortDB);
            const listenRepository = MariaDbHelper.getRepository(NginxListenDB);
            const himhip = HimHIP.getData();

            if (himhip) {
                const gatewayId = await giRepository.findOne({
                    where: {
                        mac_address: himhip.gatewaymac
                    }
                });

                if (gatewayId) {
                    const nats = await natportRepository.find({
                        where: {
                            gateway_identifier_id: gatewayId.id
                        }
                    });

                    if (nats) {
                        for (const anat of nats) {
                            const res = await PingPromise.probe(anat.gateway_address);

                            if (res.alive) {
                                const client = new UpnpNatClient({
                                    gatewayAddress: anat.gateway_address
                                });

                                try {
                                    const mappings = await client.getMappings();

                                    UpnpNatCache.getInstance().addGatewayMappings(
                                        `${gatewayId.mac_address}-${anat.gateway_address}`,
                                        mappings
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
                                        const alisten = await listenRepository.findOne({
                                            where: {
                                                id: anat.listen_id
                                            }
                                        });

                                        if (alisten) {
                                            options.private = alisten.listen_port;

                                            if (alisten.disable) {
                                                Logger.getLogger().info('UpnpNatService::update: Listen is disable, skip to next ...');
                                                continue;
                                            }
                                        }
                                    }

                                    const map = await client.createMapping(options);

                                    if (map) {
                                        Logger.getLogger().info(`UpnpNatService::update: Port mapping create  ${anat.gateway_address}:${anat.public_port} -> ${options.clientAddress}:${options.private}`);
                                    }
                                } catch (ex) {
                                    Logger.getLogger().info(`UpnpNatService::update: Port mapping faild ${anat.gateway_address}:${anat.public_port} -> ${options.clientAddress}:${options.private}`);
                                }
                            } else {
                                Logger.getLogger().info(`UpnpNatService::update: Gateway '${anat.gateway_address}' unreachable, skip ahead ...`);
                            }
                        }
                    } else {
                        Logger.getLogger().info(`UpnpNatService::update: Upnp-Nat list is empty by Gateway Identifier: ${gatewayId.id}`);
                    }
                } else {
                    Logger.getLogger().info(`UpnpNatService::update: Gateway identifier not found by mac: ${himhip.gatewaymac}`);
                }
            } else {
                Logger.getLogger().info('UpnpNatService::update: HimHip service is not ready, skip upnpnat service ...');
            }
        } catch (e) {
            Logger.getLogger().error(e);
        }
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        this._scheduler = scheduleJob('*/1 * * * *', async() => {
            await this.update();
        });
    }

    /**
     * stop
     */
    public async stop(): Promise<void> {
        if (this._scheduler !== null) {
            this._scheduler.cancel();
        }
    }

}