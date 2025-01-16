import {RemoteInfo} from 'dgram';
import DNS, {DnsAnswer, DnsQuestion, DnsRequest, DnsResponse} from 'dns2';
import {
    DnsRecordBase,
    DomainRecordDB,
    DomainRecordServiceDB,
    DomainServiceDB,
    IDnsServer,
    Logger
} from 'flyingfish_core';
import {v4 as uuid} from 'uuid';
import {SchemaErrors} from 'vts';
import {Config} from '../Config/Config.js';
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
export class Dns2Server implements IDnsServer {

    /**
     * instance
     * @private
     */
    private static _instance: Dns2Server | null = null;

    /**
     * getInstance
     */
    public static getInstance(): Dns2Server {
        if (Dns2Server._instance === null) {
            Dns2Server._instance = new Dns2Server();
        }

        return Dns2Server._instance;
    }

    /**
     * server
     * @protected
     */
    protected _server;

    /**
     * Temp records for DNS record anwsers
     * @protected
     */
    protected _tempRecords: Map<number, Map<string, DnsRecordBase>> = new Map<number, Map<string, DnsRecordBase>>();

    /**
     * Temp domains for DNS record anwsers
     * @protected
     */
    protected _tempDomains: Map<string, DnsRecordBase[]> = new Map<string, DnsRecordBase[]>();

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
                const response = await this._handleRequest(request, rinfo);

                if (response) {
                    send(response);
                }
            }
        });
    }

    /**
     * Handle for dns requests
     * @param {DnsRequest} request
     * @param rinfo
     * @protected
     * @returns {DnsResponse|null}
     */
    protected async _handleRequest(
        request: DnsRequest,
        rinfo: RemoteInfo
    ): Promise<DnsResponse|null> {
        try {
            const response = DNS.Packet.createResponseFromRequest(request);
            const [question] = request.questions;
            const questionExt = question as DnsQuestionExt;

            Logger.getLogger().info(
                `Request by ID: ${request.header.id}`,
                {
                    class: 'Dns2Server::_handleRequest',
                    question: request.questions[0],
                    remote_address: rinfo.address,
                    remote_port: rinfo.port,
                    requestid: request.header.id
                }
            );

            const domain = await DomainServiceDB.getInstance().findByName(questionExt.name.toLowerCase());

            if (domain) {
                let records: DomainRecordDB[];

                if (questionExt.class && questionExt.type) {
                    records = await DomainRecordServiceDB.getInstance().findAllBy(
                        domain.id,
                        questionExt.class,
                        questionExt.type
                    );
                } else {
                    records = await DomainRecordServiceDB.getInstance().findAllByDomain(domain.id);
                }

                for (const record of records) {
                    let recordSettings = null;

                    if (record.settings !== '') {
                        try {
                            recordSettings = JSON.parse(record.settings);
                        } catch (e) {
                            Logger.getLogger().error(
                                'Record settings parse failed: %d',
                                record.id,
                                {
                                    class: 'Dns2Server::_handleRequest'
                                }
                            );
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
                            if (recordSettings && SchemaRecordSettingsTlSA.validate(recordSettings, settingsErrors)) {
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
                            Logger.getLogger().error(
                                'Setting error: %s',
                                error,
                                {
                                    class: 'Dns2Server::_handleRequest',
                                    requestid: request.header.id
                                }
                            );
                        }
                    }
                }

                if (questionExt.class && questionExt.type) {
                    const answers = this._handleTmpRecords(
                        domain.id,
                        questionExt.class,
                        questionExt.type
                    );

                    if (answers.length > 0) {
                        response.answers.push(...answers);
                    }
                }
            } else {
                const answers = this._handleTmpDomains(questionExt.name);

                if (answers.length > 0) {
                    response.answers.push(...answers);
                } else {
                    const resolverAnswers = await this._handleResolver(questionExt.name, questionExt.type);

                    if (resolverAnswers.length > 0) {
                        response.answers.push(...resolverAnswers);
                    }
                }
            }

            Logger.getLogger().info(
                'Found match, send (%d) by request-id: %s',
                response.answers.length,
                request.header.id,
                {
                    class: 'Dns2Server::_handleRequest',
                    requestid: request.header.id
                }
            );

            return response;
        } catch (e) {
            Logger.getLogger().info(
                'Faild to processing the dns question by: %s:%d',
                rinfo.address,
                rinfo.port,
                {
                    class: 'Dns2Server::_handleRequest:',
                    requestid: request.header.id
                }
            );
        }

        Logger.getLogger().warn(
            'No match found, return null as answer by request-id: %s',
            request.header.id,
            {
                class: 'Dns2Server::_handleRequest:',
                requestid: request.header.id
            }
        );

        return null;
    }

    /**
     * Handle the temporary records for a domain.
     * @param {number} domainId
     * @param {number} recordClass
     * @param {[number]} recordType
     * @protected
     * @returns {DnsAnswer[]}
     */
    protected _handleTmpRecords(domainId: number, recordClass: number, recordType?: number): DnsAnswer[] {
        const answers: DnsAnswer[] = [];

        const tmpDomain = this._tempRecords.get(domainId);

        if (tmpDomain) {
            for (const [, record] of tmpDomain) {
                if (recordClass !== record.class || recordType !== record.type) {
                    continue;
                }

                switch (record.type) {
                    case DNS.Packet.TYPE.TXT:
                        answers.push({
                            name: record.name,
                            type: record.type,
                            class: record.class,
                            ttl: record.ttl,
                            data: record.data
                        } as DnsAnswerTXT);
                        break;
                }
            }
        }

        return answers;
    }

    /**
     * Handle request tmp domain
     * @param {string} domainName
     * @protected
     * @returns {DnsAnswer[]}
     */
    protected _handleTmpDomains(domainName: string): DnsAnswer[] {
        const answers: DnsAnswer[] = [];

        const domainRecords = this._tempDomains.get(domainName.toLowerCase());

        if (domainRecords) {
            for (const record of domainRecords) {

                switch (record.type) {
                    case DNS.Packet.TYPE.TXT:
                        answers.push({
                            name: domainName,
                            type: record.type,
                            class: record.class,
                            ttl: record.ttl,
                            data: record.data
                        } as DnsAnswerTXT);
                        break;
                }
            }
        }

        return answers;
    }

    protected async _handleResolver(domainName: string, recordType?: number): Promise<DnsAnswer[]> {
        const answers: DnsAnswer[] = [];

        const resolver = new DNS();

        let result: DNS.DnsResponse | null = null;

        if (recordType) {
            switch (recordType) {
                case DNS.Packet.TYPE.A:
                    result = await resolver.resolveA(domainName);
                    break;

                case DNS.Packet.TYPE.AAAA:
                    result = await resolver.resolveAAAA(domainName);
                    break;

                case DNS.Packet.TYPE.MX:
                    result = await resolver.resolveMX(domainName);
                    break;

                case DNS.Packet.TYPE.CNAME:
                    result = await resolver.resolveCNAME(domainName);
                    break;
            }
        }

        if (result) {
            // TODO
        }

        return answers;
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

        Logger.getLogger().info(
            'Flingfish DNS listening on the TCP/UDP: %d',
            port,
            {
                class: 'Dns2Server::listen'
            }
        );
    }

    /**
     * add a temporary record to a domain
     * @param {number} domainId
     * @param {DnsRecordBase} record
     * @returns {string} temporary identification
     */
    public addTempRecord(
        domainId: number,
        record: DnsRecordBase
    ): string {
        const tmpId = uuid();

        if(!this._tempRecords.has(domainId)) {
            this._tempRecords.set(domainId, new Map<string, DnsRecordBase>());
        }

        const records = this._tempRecords.get(domainId)!;
        records.set(tmpId, record);

        Logger.getLogger().silly(
            'Add temp record (%d) to domain-id: %d',
            record.type,
            domainId,
            {
                class: 'Dns2Server::addTempRecord'
            }
        );

        this._tempRecords.set(domainId, records);

        return tmpId;
    }

    /**
     * remove all temporary record by domain id
     * @param {number} domainId
     * @returns {boolean}
     */
    public removeAllTemp(domainId: number): boolean {
        return this._tempRecords.delete(domainId);
    }

    /**
     * remove a temporary record by identification
     * @param {string} tempId
     * @returns {boolean}
     */
    public removeTempRecord(tempId: string): boolean {
        for (const [domainId, records] of this._tempRecords) {
            if (records.has(tempId)) {
                const isDeleted = records.delete(tempId);

                if (isDeleted) {
                    this._tempRecords.set(domainId, records);
                }

                return isDeleted;
            }
        }

        return false;
    }

    /**
     * add a temporary domain with records
     * @param {string} domainName
     * @param {DnsRecordBase[]} records
     * @returns {boolean}
     */
    public addTempDomain(
        domainName: string,
        records: DnsRecordBase[]
    ): boolean {
        if (!this._tempDomains.has(domainName)) {
            Logger.getLogger().silly(
                'Add temp domain: $s',
                domainName,
                {
                    class: 'Dns2Server::addTempDomain'
                }
            );

            this._tempDomains.set(domainName, records);
            return true;
        }

        return false;
    }

    /**
     * remove temporary domain
     * @param {string} domainName
     * @returns {boolean}
     */
    public removeTempDomain(domainName: string): boolean {
        return this._tempDomains.delete(domainName);
    }

}