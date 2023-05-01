import {DateHelper, Logger} from 'flyingfish_core';
import {Job, scheduleJob} from 'node-schedule';
import Ping from 'ping';
import {UpnpNatCache} from '../Cache/UpnpNatCache.js';
import {DBHelper} from '../Db/DBHelper.js';
import {GatewayIdentifier as GatewayIdentifierDB} from '../Db/MariaDb/Entity/GatewayIdentifier.js';
import {NatPort as NatPortDB, NatStatus} from '../Db/MariaDb/Entity/NatPort.js';
import {NginxListen as NginxListenDB} from '../Db/MariaDb/Entity/NginxListen.js';
import {HimHIP} from '../HimHIP/HimHIP.js';
import {NewPortMappingOpts, UpnpNatClient} from '../Net/Upnp/UpnpNatClient.js';

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
     * _setNatPortStatus
     * @param status
     * @param natId
     * @protected
     */
    protected async _setNatPortStatus(status: NatStatus, natId: number): Promise<void> {
        const natportRepository = DBHelper.getRepository(NatPortDB);

        await natportRepository.createQueryBuilder()
        .update()
        .set({
            last_status: status,
            last_update: DateHelper.getCurrentDbTime()
        })
        .where('id = :id', {id: natId})
        .execute();
    }

    /**
     * update
     */
    public async update(): Promise<void> {
        try {
            UpnpNatCache.getInstance().reset();

            const giRepository = DBHelper.getRepository(GatewayIdentifierDB);
            const natportRepository = DBHelper.getRepository(NatPortDB);
            const listenRepository = DBHelper.getRepository(NginxListenDB);
            const himhip = HimHIP.getData();

            // reset all status ----------------------------------------------------------------------------------------

            await natportRepository.createQueryBuilder()
            .update()
            .set({
                last_status: NatStatus.inactive,
                last_update: DateHelper.getCurrentDbTime()
            })
            .execute();

            // map -----------------------------------------------------------------------------------------------------

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
                                        const alisten = await listenRepository.findOne({
                                            where: {
                                                id: anat.listen_id
                                            }
                                        });

                                        if (alisten) {
                                            options.private = alisten.listen_port;

                                            if (alisten.disable) {
                                                Logger.getLogger().info(
                                                    `UpnpNatService::update: Listen (${alisten.listen_port}, ${alisten.description}) is disable, skip to next ...`
                                                );

                                                await this._setNatPortStatus(NatStatus.inactive, anat.id);
                                                continue;
                                            }
                                        }
                                    }

                                    const map = await client.createMapping(options);

                                    if (map) {
                                        Logger.getLogger().info(`UpnpNatService::update: Port mapping create  ${anat.gateway_address}:${anat.public_port} -> ${options.clientAddress}:${options.private}`);

                                        await this._setNatPortStatus(NatStatus.ok, anat.id);
                                    } else {
                                        await this._setNatPortStatus(NatStatus.error, anat.id);
                                    }
                                } catch (ex) {
                                    Logger.getLogger().info(`UpnpNatService::update: Port mapping faild ${anat.gateway_address}:${anat.public_port} -> ${options.clientAddress}:${options.private}`);

                                    await this._setNatPortStatus(NatStatus.error, anat.id);
                                }
                            } else {
                                Logger.getLogger().info(`UpnpNatService::update: Gateway '${anat.gateway_address}' unreachable, skip ahead ...`);

                                await this._setNatPortStatus(NatStatus.error, anat.id);
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