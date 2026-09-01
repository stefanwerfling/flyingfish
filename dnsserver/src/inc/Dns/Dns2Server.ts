import net from 'net';
import {
    A,
    AAAA,
    CNAME,
    DNS,
    DnsServer,
    MX,
    NS,
    Packet,
    PacketQuestion,
    PacketResource,
    PacketType,
    PacketTypes,
    TLSA,
    TXT
} from 'dns2ts';
import {Logger, ServiceAbstract} from 'figtree';
import {ServiceImportance, ServiceStatus} from 'figtree-schemas';
import {
    AcmeDnsTempRecordServiceDB,
    DomainRecordDB,
    DomainRecordServiceDB,
    DomainServiceDB
} from 'flyingfish_core';
import {SchemaErrors} from 'vts';
import {Config} from '../Config/Config.js';
import {SchemaRecordSettingsTlSA} from './RecordType/TLSA.js';

/**
 * Remote peer address/port extracted from a request handler client.
 */
type RemoteAddress = {
    address: string;
    port: number;
};

/**
 * Dns2Server
 *
 * Authoritative DNS server (TCP/UDP) that answers from the domain-record tables
 * and serves temporary records for the ACME DNS-01 challenge. Built on the
 * `dns2ts` library (the TypeScript rewrite of dns2, own types, zero runtime
 * deps) and migrated onto figtree's `ServiceAbstract` as a lifecycle service:
 * the framework owns start/stop, health and restart.
 *
 * Kept in `inc/Dns/` (not `Application/Service/`) because it is infrastructure
 * tightly coupled to its sibling `./RecordType/*` answer builders. Retains its
 * singleton accessor. The ACME DNS-01 temporary records are no longer held in
 * memory: the backend writes them to the shared `acme_dns_temp_record` table and
 * this server reads them at query time (DNS-server container extraction, 9.2.3).
 */
export class Dns2Server extends ServiceAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'dnsserver';

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
    protected _server!: DnsServer;

    /**
     * Fault-isolation importance for the service monitor.
     * @protected
     */
    protected override readonly _importance: ServiceImportance = ServiceImportance.Important;

    /**
     * Whether listen() has been called and stop() has not (fast gate for
     * healthCheck before the socket probe).
     * @protected
     */
    protected _listening: boolean = false;

    /**
     * The TCP/UDP port the server bound to; used by the healthCheck socket probe.
     * @protected
     */
    protected _boundPort: number = 0;

    /**
     * constructor
     */
    public constructor() {
        super(Dns2Server.NAME, [ 'mariadb' ]);

        this._createServer();
    }

    /**
     * Create (or recreate) the dns2ts server object with the request handler.
     * Used by the constructor and by the restart-safe reset in start().
     * @protected
     */
    protected _createServer(): void {
        this._server = new DnsServer({
            udp: true,
            tcp: true,
            handle: async(
                request: Packet,
                send: (response: Packet | Buffer | (Packet | Buffer)[]) => void,
                client: unknown
            ): Promise<void> => {
                const response = await this._handleRequest(request, client);

                if (response) {
                    send(response);
                }
            }
        });
    }

    /**
     * Build an answer resource for the queried name/class from a typed record.
     * @param {PacketQuestion} question
     * @param {PacketType} record
     * @param {number} ttl
     * @protected
     * @returns {PacketResource}
     */
    protected _answer(question: PacketQuestion, record: PacketType, ttl: number): PacketResource {
        return Packet.createResourceFromQuestion(question, record, ttl);
    }

    /**
     * Handle for dns requests
     * @param {Packet} request
     * @param {unknown} client - remote info (dgram.RemoteInfo) or socket, protocol dependent
     * @protected
     * @returns {Promise<Packet|null>}
     */
    protected async _handleRequest(
        request: Packet,
        client: unknown
    ): Promise<Packet|null> {
        const remote = Dns2Server._remoteAddress(client);

        try {
            const response = Packet.createResponseFromRequest(request);
            const [question] = request.questions;

            Logger.getLogger().info(
                `Request by ID: ${request.header.id}`,
                {
                    class: 'Dns2Server::_handleRequest',
                    question: request.questions[0],
                    remote_address: remote.address,
                    remote_port: remote.port,
                    requestid: request.header.id
                }
            );

            const domain = await DomainServiceDB.getInstance().findByName(question.name.toLowerCase());

            if (domain) {
                let records: DomainRecordDB[];

                if (question.class && question.type) {
                    records = await DomainRecordServiceDB.getInstance().findAllBy(
                        domain.id,
                        question.class,
                        question.type
                    );
                } else {
                    records = await DomainRecordServiceDB.getInstance().findAllByDomain(domain.id);
                }

                for (const record of records) {
                    let recordSettings = null;

                    if (record.settings !== '') {
                        try {
                            recordSettings = JSON.parse(record.settings);
                        } catch {
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
                        case PacketTypes.TXT:
                            response.answers.push(this._answer(question, new TXT(record.dvalue), record.ttl));
                            break;

                        case PacketTypes.A:
                            response.answers.push(this._answer(question, new A(record.dvalue), record.ttl));
                            break;

                        case PacketTypes.AAAA:
                            response.answers.push(this._answer(question, new AAAA(record.dvalue), record.ttl));
                            break;

                        case PacketTypes.NS:
                            response.answers.push(this._answer(question, new NS(record.dvalue), record.ttl));
                            break;

                        case PacketTypes.MX:
                            response.answers.push(this._answer(question, new MX(record.dvalue), record.ttl));
                            break;

                        case PacketTypes.CNAME:
                            response.answers.push(this._answer(question, new CNAME(record.dvalue), record.ttl));
                            break;

                        case PacketTypes.TLSA:
                            if (recordSettings && SchemaRecordSettingsTlSA.validate(recordSettings, settingsErrors)) {
                                response.answers.push(this._answer(
                                    question,
                                    new TLSA(
                                        parseInt(recordSettings.certificate_usage, 10),
                                        parseInt(recordSettings.selector, 10),
                                        parseInt(recordSettings.matching_type, 10),
                                        record.dvalue
                                    ),
                                    record.ttl
                                ));
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

            } else {
                const answers = await this._handleTmpDomains(question.name);

                if (answers.length > 0) {
                    response.answers.push(...answers);
                } else {
                    const resolverAnswers = await this._handleResolver(question.name, question.type);

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
        } catch {
            Logger.getLogger().info(
                'Faild to processing the dns question by: %s:%d',
                remote.address,
                remote.port,
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
     * Best-effort extraction of the remote address/port for logging. The request
     * handler's client is protocol dependent (dgram.RemoteInfo for UDP, a socket
     * for TCP), so read both shapes defensively and never throw.
     * @param {unknown} client
     * @protected
     * @returns {RemoteAddress}
     */
    protected static _remoteAddress(client: unknown): RemoteAddress {
        if (client && typeof client === 'object') {
            const info = client as {
                address?: unknown;
                port?: unknown;
                remoteAddress?: unknown;
                remotePort?: unknown;
            };

            if (typeof info.address === 'string' && typeof info.port === 'number') {
                return {
                    address: info.address,
                    port: info.port
                };
            }

            if (typeof info.remoteAddress === 'string' && typeof info.remotePort === 'number') {
                return {
                    address: info.remoteAddress,
                    port: info.remotePort
                };
            }
        }

        return {
            address: 'unknown',
            port: 0
        };
    }

    /**
     * Handle request tmp domain: read the ACME DNS-01 temporary records for this
     * name from the shared `acme_dns_temp_record` table (written by the backend).
     * @param {string} domainName
     * @protected
     * @returns {Promise<PacketResource[]>}
     */
    protected async _handleTmpDomains(domainName: string): Promise<PacketResource[]> {
        const answers: PacketResource[] = [];

        const records = await AcmeDnsTempRecordServiceDB.getInstance().findByName(domainName.toLowerCase());

        for (const record of records) {
            switch (record.dtype) {
                case PacketTypes.TXT:
                    answers.push(new PacketResource(
                        record.name,
                        new TXT(record.dvalue),
                        record.dclass,
                        record.ttl
                    ));
                    break;
            }
        }

        return answers;
    }

    /**
     * Resolve a name upstream when it is not served locally. Placeholder: the
     * upstream answers are not yet mapped back into the response.
     * @param {string} domainName
     * @param {number} [recordType]
     * @protected
     * @returns {Promise<PacketResource[]>}
     */
    protected async _handleResolver(domainName: string, recordType?: number): Promise<PacketResource[]> {
        const answers: PacketResource[] = [];

        const resolver = new DNS();

        let result: Packet | null = null;

        if (recordType) {
            switch (recordType) {
                case PacketTypes.A:
                    result = await resolver.resolveA(domainName);
                    break;

                case PacketTypes.AAAA:
                    result = await resolver.resolveAAAA(domainName);
                    break;

                case PacketTypes.MX:
                    result = await resolver.resolveMX(domainName);
                    break;

                case PacketTypes.CNAME:
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
     * Start the DNS server (invoked by the service manager once its
     * dependencies are up).
     */
    public override async start(): Promise<void> {
        this._status = ServiceStatus.Progress;
        await this._resetServer();
        await this.listen();
        this._status = ServiceStatus.Success;
    }

    /**
     * Restart-safe reset: the monitor re-invokes start() on an unhealthy server
     * without a prior stop(), so if a previous start left the sockets bound
     * (possibly dead) close them and recreate the dns2ts server before listen()
     * re-binds. No-op on the initial start.
     * @protected
     */
    protected async _resetServer(): Promise<void> {
        if (!this._listening) {
            return;
        }

        try {
            await this._server.close();
        } catch {
            Logger.getLogger().silly(
                'Dns2Server::_resetServer: close before recreate failed (socket likely already down)'
            );
        }

        this._listening = false;
        this._createServer();
    }

    /**
     * Stop the DNS server, releasing the TCP/UDP sockets.
     * @param {boolean} _forced
     */
    public override async stop(_forced: boolean = false): Promise<void> {
        await this._server.close();
        this._listening = false;
        this._status = ServiceStatus.None;
    }

    /**
     * Health check for the service monitor: healthy while listen() is in effect
     * AND the TCP DNS port still accepts a connection (dns2ts listens TCP on the
     * same port). A dead socket that never flipped `_listening` is caught by the
     * probe, so an unhealthy DNS server triggers the monitor's restart.
     * @returns {Promise<boolean>}
     */
    public override async healthCheck(): Promise<boolean> {
        if (!this._listening) {
            return false;
        }

        return Dns2Server._probeTcp('127.0.0.1', this._boundPort, 1000);
    }

    /**
     * Open a short-lived TCP connection to test that something is listening on
     * the port. Resolves true on connect, false on error/timeout; never throws.
     * @param {string} host
     * @param {number} port
     * @param {number} timeoutMs
     * @returns {Promise<boolean>}
     * @protected
     */
    protected static _probeTcp(host: string, port: number, timeoutMs: number): Promise<boolean> {
        return new Promise<boolean>((resolve): void => {
            const socket = net.connect({host: host, port: port});
            let settled = false;

            const finish = (ok: boolean): void => {
                if (settled) {
                    return;
                }

                settled = true;
                socket.destroy();
                resolve(ok);
            };

            socket.setTimeout(timeoutMs);
            socket.once('connect', (): void => finish(true));
            socket.once('timeout', (): void => finish(false));
            socket.once('error', (): void => finish(false));
        });
    }

    /**
     * start server listen
     */
    public async listen(): Promise<void> {
        let port = Config.DEFAULT_DNSSERVER_PORT;

        const dnsserver = Config.getInstance().get()?.dnsserver;

        if (dnsserver) {
            if (dnsserver.port) {
                port = dnsserver.port;
            }
        }

        await this._server.listen({
            udp: port,
            tcp: port
        });

        this._boundPort = port;
        this._listening = true;

        Logger.getLogger().info(
            'Flingfish DNS listening on the TCP/UDP: %d',
            port,
            {
                class: 'Dns2Server::listen'
            }
        );
    }

}