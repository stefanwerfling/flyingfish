import {NginxDomain as NginxDomainDB} from '../Db/MariaDb/Entity/NginxDomain';
import {NginxStream as NginxStreamDB} from '../Db/MariaDb/Entity/NginxStream';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {Map as NginxMap} from '../Nginx/Config/Map';
import {Server as NginxConfServer} from '../Nginx/Config/Server';
import {Upstream} from '../Nginx/Config/Upstream';
import {NginxServer} from '../Nginx/NginxServer';

/**
 * NginxService
 */
export class NginxService {

    /**
     * ngnix service instance
     * @private
     */
    private static _instance: NginxService|null = null;

    /**
     * getInstance
     */
    public static getInstance(): NginxService {
        if (NginxService._instance === null) {
            NginxService._instance = new NginxService();
        }

        return NginxService._instance;
    }

    /**
     * _loadConfig
     * @private
     */
    private async _loadConfig(): Promise<void> {
        const conf = NginxServer.getInstance().getConf();
        conf?.resetStream();
        conf?.resetHttp();

        // vars --------------------------------------------------------------------------------------------------------

        const streamMap: Map<number, Map<string, NginxStreamDB>> = new Map();

        // read db -----------------------------------------------------------------------------------------------------

        const domainRepository = MariaDbHelper.getRepository(NginxDomainDB);
        const streamRepository = MariaDbHelper.getRepository(NginxStreamDB);

        const domains = await domainRepository.find();

        for (const adomain of domains) {

            // read streams by db --------------------------------------------------------------------------------------

            const tstreams = await streamRepository.find({
                where: {
                    domain_id: adomain.id
                }
            });

            for (const astream of tstreams) {
                if (!streamMap.has(astream.listen_port)) {
                    streamMap.set(astream.listen_port, new Map<string, NginxStreamDB>());
                }

                const mapDomainStreams = streamMap.get(astream.listen_port);
                mapDomainStreams!.set(adomain.domainname, astream);

                streamMap.set(astream.listen_port, mapDomainStreams!);
            }

            // read http by db -----------------------------------------------------------------------------------------

        }

        // fill config -------------------------------------------------------------------------------------------------

        streamMap.forEach((domainStreams, listenPort) => {
            const varName = `$ffstream${listenPort}`;
            const aMap = new NginxMap('$ssl_preread_server_name', varName);
            let defaultMapDomain: string|null = null;

            domainStreams.forEach((tstream, domainName) => {
                let upstreamName = 'ffus_';

                if (tstream.alias_name !== '') {
                    upstreamName += `${tstream.alias_name}_`;
                }

                upstreamName += `${tstream.domain_id}`;

                const upStream = new Upstream(upstreamName);
                upStream.addVariable('server', `${tstream.destination_address}:${tstream.destination_port}`);

                conf?.getStream().addUpstream(upStream);
                aMap.addVariable(`${domainName}`, upstreamName);

                if (tstream.isdefault) {
                    defaultMapDomain = upstreamName;
                }
            });

            if (defaultMapDomain !== null) {
                aMap.addVariable('default', defaultMapDomain);
            }

            conf?.getStream().addMap(aMap);

            const aServer = new NginxConfServer();
            aServer.setListen(listenPort);
            aServer.addVariable('proxy_pass', varName);
            aServer.addVariable('ssl_preread', 'on');

            conf?.getStream().addServer(aServer);
        });
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        await this._loadConfig();
        NginxServer.getInstance().start();

        if (NginxServer.getInstance().isRun()) {
            console.log('Nginx server is start');
        }
    }

    /**
     * stop
     */
    public async stop(): Promise<void> {
        if (NginxServer.getInstance().isRun()) {
            NginxServer.getInstance().stop();
        }
    }

    /**
     * reload
     */
    public async reload(): Promise<void> {
        await this._loadConfig();
        NginxServer.getInstance().reload();

        if (NginxServer.getInstance().isRun()) {
            console.log('Nginx server is reload');
        }
    }

}