import {Job, scheduleJob} from 'node-schedule';
import {UpnpNatCache} from '../Cache/UpnpNatCache';
import {NatPort as NatPortDB} from '../Db/MariaDb/Entity/NatPort';
import {promise as PingPromise} from 'ping';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
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
                // all nats without parent
                const nats = await natportRepository.find({
                    where: {
                        nat_port_id: 0
                    }
                });

                UpnpNatCache.getInstance().reset();

                if (nats) {
                    for (const anat of nats) {
                        const res = await PingPromise.probe(anat.gateway_address);

                        if (res.alive) {
                            const client = new UpnpNatClient({
                                gatewayAddress: anat.gateway_address
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
                                    console.log(`Different or new gateway? Ids differ (${gatewayid}<-->${anat.gateway_id}), skip to next. Check the settings.`);
                                    continue;
                                }
                            } catch (et) {
                                console.log('Gateway mapping info error');
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
                                    console.log(`Port mapping create  ${anat.gateway_address}:${anat.public_port} -> ${anat.client_address}:${anat.private_port}`);
                                }
                            } catch (ex) {
                                console.log(`Port mapping faild ${anat.gateway_address}:${anat.public_port} -> ${anat.client_address}:${anat.private_port}`);
                            }

                        } else {
                            console.log(`Gateway '${anat.gateway_address}' unreachable, skip ahead ...`);
                        }
                    }
                }
            } catch (e) {
                console.log(e);
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