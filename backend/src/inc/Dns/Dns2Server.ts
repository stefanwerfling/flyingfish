import {RemoteInfo} from 'dgram';
import DNS, {DnsQuestion, DnsRequest, DnsResponse} from 'dns2';
import {Logger} from 'flyingfish_core';
import {SchemaErrors} from 'vts';
import {Config} from '../Config/Config.js';
import {DomainService} from '../Db/MariaDb/DomainService.js';
import {DomainRecord as DomainRecordDB} from '../Db/MariaDb/Entity/DomainRecord.js';
import {DBHelper} from '../Db/MariaDb/DBHelper.js';
import {DnsAnswerMX} from './RecordType/MX.js';
import {DnsAnswerNS} from './RecordType/NS.js';
import {DnsAnswerTlSA, SchemaRecordSettingsTlSA, TLSACertificateUsage} from './RecordType/TLSA.js';
import {DnsAnswerTXT} from './RecordType/TXT.js';

/**
 * DnsQuestionExt
 */
interface DnsQuestionExt extends DnsQuestion {
    class?: number;
    type?: number;
}

/**
 * TYPE_EXT
 * see https://de.wikipedia.org/wiki/Resource_Record
 */
export const TYPE_EXT = {
    TLSA: 52
};

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
                request: DnsRequest,
                send: (response: DnsResponse) => void,
                rinfo: RemoteInfo
            ) => {
                try {
                    const response = DNS.Packet.createResponseFromRequest(request);
                    const [question] = request.questions;
                    const questionExt = question as DnsQuestionExt;

                    Logger.getLogger().info(`Dns2Server::request: ${request.header.id}`, request.questions[0]);
                    Logger.getLogger().info(`Dns2Server::request: Remote-Info ${rinfo.address}:${rinfo.port}`);

                    const domain = await DomainService.findByName(questionExt.name);

                    if (domain) {
                        const domainRecordRepository = DBHelper.getRepository(DomainRecordDB);
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
                            let recordSettings = null;

                            if (record.settings !== '') {
                                try {
                                    recordSettings = JSON.parse(record.settings);
                                } catch (e) {
                                    Logger.getLogger().error(`Dns2Server::request: record settings parse failed: ${record.id}`);
                                }
                            }

                            const settingsErrors: SchemaErrors = [];

                            switch (record.dtype) {
                                case DNS.Packet.TYPE.TXT:
                                    response.answers.push({
                                        name: questionExt.name,
                                        type: record.dtype,
                                        class: record.dclass,
                                        ttl: record.ttl,
                                        data: record.dvalue
                                    } as DnsAnswerTXT);
                                    break;

                                case DNS.Packet.TYPE.A:
                                case DNS.Packet.TYPE.AAAA:
                                    response.answers.push({
                                        name: questionExt.name,
                                        type: record.dtype,
                                        class: record.dclass,
                                        ttl: record.ttl,
                                        address: record.dvalue
                                    });
                                    break;

                                case DNS.Packet.TYPE.NS:
                                    response.answers.push({
                                        name: questionExt.name,
                                        type: record.dtype,
                                        class: record.dclass,
                                        ttl: record.ttl,
                                        ns: record.dvalue
                                    } as DnsAnswerNS);
                                    break;

                                case DNS.Packet.TYPE.MX:
                                    response.answers.push({
                                        name: questionExt.name,
                                        type: record.dtype,
                                        class: record.dclass,
                                        ttl: record.ttl,
                                        exchange: record.dvalue
                                    } as DnsAnswerMX);
                                    break;

                                case DNS.Packet.TYPE.CNAME:
                                    response.answers.push({
                                        name: questionExt.name,
                                        type: record.dtype,
                                        class: record.dclass,
                                        ttl: record.ttl,
                                        domain: record.dvalue
                                    });
                                    break;

                                case TYPE_EXT.TLSA:
                                    if (SchemaRecordSettingsTlSA.validate(recordSettings, settingsErrors)) {
                                        response.answers.push({
                                            name: questionExt.name,
                                            type: record.dtype,
                                            class: record.dclass,
                                            ttl: record.ttl,
                                            certificate_usage: parseInt(recordSettings.certificate_usage, 10) ?? TLSACertificateUsage.DOMAIN_ISSUED_CERTIFICATE,
                                            selector: parseInt(recordSettings.selector, 10),
                                            matching_type: parseInt(recordSettings.matching_type, 10),
                                            certificate_association_data: record.dvalue
                                        } as DnsAnswerTlSA);
                                    }
                                    break;
                            }

                            if (settingsErrors.length > 0) {
                                Logger.getLogger().error('Dns2Server::request:recordSettings:');
                                for (const error of settingsErrors) {
                                    Logger.getLogger().error(`- ${error}`);
                                }
                            }
                        }
                    } else {
                        const resolver = new DNS();

                        let result: DNS.DnsResponse | null = null;

                        switch (questionExt.type) {
                            case DNS.Packet.TYPE.A:
                                result = await resolver.resolveA(questionExt.name);
                                break;

                            case DNS.Packet.TYPE.AAAA:
                                result = await resolver.resolveAAAA(questionExt.name);
                                break;

                            case DNS.Packet.TYPE.MX:
                                result = await resolver.resolveMX(questionExt.name);
                                break;

                            case DNS.Packet.TYPE.CNAME:
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
        let port = Config.DEFAULT_DNSSERVER_PORT;

        const dnsserver = Config.getInstance().get()?.dnsserver;

        if (dnsserver) {
            if (dnsserver.port) {
                port = dnsserver.port;
            }
        }

        this._server.listen({
            udp: port,
            tcp: port
        });

        Logger.getLogger().info(`Dns2Server::listen: Flingfish DNS listening on the TCP/UDP: ${port}`);
    }

}