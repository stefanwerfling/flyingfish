import {Job, scheduleJob} from 'node-schedule';
import {UpnpNatCache} from '../Cache/UpnpNatCache';
import {NatPort as NatPortDB} from '../Db/MariaDb/Entity/NatPort';
import {promise as PingPromise} from 'ping';
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
     * start
     */
    public async start(): Promise<void> {
        const natportRepository = MariaDbHelper.getRepository(NatPortDB);

        this._scheduler = scheduleJob('*/1 * * * *', async() => {
            try {
                const himhip = HimHIP.getData();
                console.log(himhip);
                // all nats without parent
                const nats = await natportRepository.find({
                    where: {
                        nat_port_id: 0
                    }
                });

                UpnpNatCache.getInstance().reset();

                if (nats) {
                    for (const anat of nats) {
                        let gateway_address = anat.gateway_address;

                        if (himhip) {
                            gateway_address = himhip.gateway;
                        }

                        const res = await PingPromise.probe(gateway_address);

                        if (res.alive) {
                            const client = new UpnpNatClient({
                                gatewayAddress: gateway_address
                            });

                            try {
                                const device = await client.getGateway();
                                const gatewayid = device.gateway.getUuid();

                                if (gatewayid === anat.gateway_id) {
                                    const mappings = await client.getMappings();

                                    UpnpNatCache.getInstance().addGatewayMappings(
                                        gatewayid,
                                        mappings
                                    );
                                } else {
                                    Logger.getLogger().info(`Different or new gateway? Ids/MAC differ (${gatewayid}<-->${anat.gateway_id}), skip to next. Check the settings.`);
                                    continue;
                                }
                            } catch (et) {
                                Logger.getLogger().info('Gateway mapping info error/empty');
                            }

                            try {
                                const options: NewPortMappingOpts = {
                                    description: anat.description,
                                    public: anat.public_port,
                                    private: anat.private_port,
                                    ttl: anat.ttl
                                };

                                if (anat.client_address !== '') {
                                    options.clientAddress = anat.client_address;
                                }

                                const map = await client.createMapping(options);

                                if (map) {
                                    Logger.getLogger().info(`Port mapping create  ${anat.gateway_address}:${anat.public_port} -> ${anat.client_address}:${anat.private_port}`);
                                }
                            } catch (ex) {
                                Logger.getLogger().info(`Port mapping faild ${anat.gateway_address}:${anat.public_port} -> ${anat.client_address}:${anat.private_port}`);
                            }

                        } else {
                            Logger.getLogger().info(`Gateway '${anat.gateway_address}' unreachable, skip ahead ...`);
                        }
                    }
                }
            } catch (e) {
                Logger.getLogger().error(e);
            }
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