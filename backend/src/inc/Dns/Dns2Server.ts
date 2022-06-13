import DNS = require('dns2');
import {Domain as DomainDB} from '../Db/MariaDb/Entity/Domain';
import {DomainRecord as DomainRecordDB} from '../Db/MariaDb/Entity/DomainRecord';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {Logger} from '../Logger/Logger';
const {Packet} = DNS;

/**
 * Dns2Server
 */
export class Dns2Server {

    /**
     * server
     * @protected
     */
    protected _server;

    /**
     * constructor
     */
    public constructor() {
        this._server = DNS.createServer({
            udp: true,
            tcp: true,
            handle: async(
                request,
                send,
                rinfo
            ) => {
                const response = Packet.createResponseFromRequest(request);
                const [question] = request.questions;
                const {name} = question;

                Logger.getLogger().info(`Dns2Server::request: ${request.header.id}`, request.questions[0]);
                Logger.getLogger().info(`Dns2Server::request: Remote-Info ${rinfo.address}:${rinfo.port}`);

                const domainRepository = MariaDbHelper.getRepository(DomainDB);

                const domain = await domainRepository.findOne({
                    where: {
                        domainname: name
                    }
                });

                if (domain) {
                    const domainRecordRepository = MariaDbHelper.getRepository(DomainRecordDB);

                    const records = await domainRecordRepository.find({
                        where: {
                            domain_id: domain.id
                        }
                    });

                    for (const record of records) {
                        switch (record.dtype) {
                            case Packet.TYPE.A:
                                response.answers.push({
                                    name,
                                    type: record.dtype,
                                    class: record.dclass,
                                    ttl: record.ttl,
                                    address: record.dvalue
                                });
                                break;

                            case Packet.TYPE.CNAME:
                                response.answers.push({
                                    name,
                                    type: record.dtype,
                                    class: record.dclass,
                                    ttl: record.ttl,
                                    domain: record.dvalue
                                });
                                break;
                        }
                    }
                }

                send(response);
            }
        });
    }

    /**
     * start server listen
     */
    public listen(): void {
        this._server.listen({
            udp: 5333,
            tcp: 5333
        });
    }

}