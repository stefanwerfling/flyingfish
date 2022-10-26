import DNS = require('dns2');
import {DnsAnswer, DnsQuestion} from 'dns2';
import {Config} from '../Config/Config';
import {Domain as DomainDB} from '../Db/MariaDb/Entity/Domain';
import {DomainRecord as DomainRecordDB} from '../Db/MariaDb/Entity/DomainRecord';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {Logger} from '../Logger/Logger';
const {Packet} = DNS;

/**
 * DnsAnswerTxt
 */
interface DnsAnswerTxt extends DnsAnswer {
    data?: string;
}

/**
 * DnsAnswerMX
 */
interface DnsAnswerMX extends DnsAnswer {
    exchange?: string;
}

/**
 * DnsAnswerNs
 */
interface DnsAnswerNs extends DnsAnswer {
    ns?: string;
}

/**
 * DnsQuestionExt
 */
interface DnsQuestionExt extends DnsQuestion {
    class?: number;
    type?: number;
}

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
                try {
                    const response = Packet.createResponseFromRequest(request);
                    const [question] = request.questions;
                    const questionExt = question as DnsQuestionExt;

                    Logger.getLogger().info(`Dns2Server::request: ${request.header.id}`, request.questions[0]);
                    Logger.getLogger().info(`Dns2Server::request: Remote-Info ${rinfo.address}:${rinfo.port}`);

                    const domainRepository = MariaDbHelper.getRepository(DomainDB);

                    const domain = await domainRepository.findOne({
                        where: {
                            domainname: questionExt.name,
                            disable: false
                        }
                    });

                    if (domain) {
                        const domainRecordRepository = MariaDbHelper.getRepository(DomainRecordDB);
                        let records: DomainRecordDB[];

                        if ((questionExt.class !== null) && (questionExt.type !== null)) {
                            records = await domainRecordRepository.find({
                                where: {
                                    domain_id: domain.id,
                                    dclass: questionExt.class,
                                    dtype: questionExt.type
                                }
                            });
                        } else {
                            records = await domainRecordRepository.find({
                                where: {
                                    domain_id: domain.id
                                }
                            });
                        }

                        for (const record of records) {
                            switch (record.dtype) {
                                case Packet.TYPE.TXT:
                                    response.answers.push({
                                        name: questionExt.name,
                                        type: record.dtype,
                                        class: record.dclass,
                                        ttl: record.ttl,
                                        data: record.dvalue
                                    } as DnsAnswerTxt);
                                    break;

                                case Packet.TYPE.A:
                                case Packet.TYPE.AAAA:
                                    response.answers.push({
                                        name: questionExt.name,
                                        type: record.dtype,
                                        class: record.dclass,
                                        ttl: record.ttl,
                                        address: record.dvalue
                                    });
                                    break;

                                case Packet.TYPE.NS:
                                    response.answers.push({
                                        name: questionExt.name,
                                        type: record.dtype,
                                        class: record.dclass,
                                        ttl: record.ttl,
                                        ns: record.dvalue
                                    } as DnsAnswerNs);
                                    break;

                                case Packet.TYPE.MX:
                                    response.answers.push({
                                        name: questionExt.name,
                                        type: record.dtype,
                                        class: record.dclass,
                                        ttl: record.ttl,
                                        exchange: record.dvalue
                                    } as DnsAnswerMX);
                                    break;

                                case Packet.TYPE.CNAME:
                                    response.answers.push({
                                        name: questionExt.name,
                                        type: record.dtype,
                                        class: record.dclass,
                                        ttl: record.ttl,
                                        domain: record.dvalue
                                    });
                                    break;
                            }
                        }
                    } else {
                        const resolver = new DNS();

                        let result: DNS.DnsResponse | null = null;

                        switch (questionExt.type) {
                            case Packet.TYPE.A:
                                result = await resolver.resolveA(questionExt.name);
                                break;

                            case Packet.TYPE.AAAA:
                                result = await resolver.resolveAAAA(questionExt.name);
                                break;

                            case Packet.TYPE.MX:
                                result = await resolver.resolveMX(questionExt.name);
                                break;

                            case Packet.TYPE.CNAME:
                                result = await resolver.resolveCNAME(questionExt.name);
                                break;
                        }

                        if (result) {
                            // TODO
                        }
                    }

                    send(response);
                } catch (e) {
                    Logger.getLogger().info(`Dns2Server::request: faild to processing the dns question by: ${rinfo.address}:${rinfo.port}`);
                }
            }
        });
    }

    /**
     * start server listen
     */
    public listen(): void {
        let port = 5333;

        const dnsserver = Config.get()?.dnsserver;

        if (dnsserver) {
            if (dnsserver.port) {
                port = dnsserver.port;
            }
        }

        this._server.listen({
            udp: port,
            tcp: port
        });
    }

}