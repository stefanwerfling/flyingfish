import {Get, JsonController, Session} from 'routing-controllers';
import {NginxDomain as NginxDomainDB} from '../../inc/Db/MariaDb/Entity/NginxDomain';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp';
import {NginxStream as NginxStreamDB} from '../../inc/Db/MariaDb/Entity/NginxStream';
import {SshPort as SshPortDB} from '../../inc/Db/MariaDb/Entity/SshPort';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * HostStream
 */
export type HostStream = {
    listen_id: number;
    destination_address: string;
    destination_port: number;
    alias_name: string;
    ssh?: {
        port: number;
    };
};

/**
 * HostHttp
 */
export type HostHttp = {
    listen_id: number;
};

/**
 * HostData
 */
export type HostData = {
    id: number;
    domainname: string;
    streams: HostStream[];
    https: HostHttp[];
};

/**
 * HostsResponse
 */
export type HostsResponse = {
    status: string;
    msg?: string;
    list: HostData[];
};

/**
 * Host
 */
@JsonController()
export class Host {

    /**
     * getDomains
     * @param session
     */
    @Get('/json/host/list')
    public async getDomains(@Session() session: any): Promise<HostsResponse> {
        const list: HostData[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const domainRepository = MariaDbHelper.getRepository(NginxDomainDB);
            const streamRepository = MariaDbHelper.getRepository(NginxStreamDB);
            const httpRepository = MariaDbHelper.getRepository(NginxHttpDB);
            const sshportRepository = MariaDbHelper.getRepository(SshPortDB);
            const domains = await domainRepository.find();

            if (domains) {
                for (const adomain of domains) {
                    const streamList: HostStream[] = [];
                    const httpList: HostHttp[] = [];

                    const streams = await streamRepository.find({
                        where: {
                            domain_id: adomain.id
                        }
                    });

                    if (streams) {
                        for (const tstream of streams) {
                            const streamEntry: HostStream = {
                                listen_id: tstream.listen_id,
                                // TODO
                                destination_address: '',
                                destination_port: 0,
                                alias_name: tstream.alias_name
                            };

                            if (tstream.sshport_id > 0) {
                                const sshport = await sshportRepository.findOne({
                                    where: {
                                        id: tstream.sshport_id
                                    }
                                });

                                if (sshport) {
                                    streamEntry.ssh = {
                                        port: sshport.port
                                    };
                                }
                            }

                            streamList.push(streamEntry);
                        }
                    }

                    const https = await httpRepository.find({
                        where: {
                            domain_id: adomain.id
                        }
                    });

                    if (https) {
                        for (const thttp of https) {
                            httpList.push({
                                listen_id: thttp.listen_id
                            });
                        }
                    }

                    list.push({
                        id: adomain.id,
                        domainname: adomain.domainname,
                        streams: streamList,
                        https: httpList
                    });
                }
            }
        } else {
            return {
                status: 'error',
                msg: 'Please login!',
                list: []
            };
        }

        return {
            status: 'ok',
            list
        };
    }

}