import {Get, JsonController, Session} from 'routing-controllers';
import {NginxDomain as NginxDomainDB} from '../../inc/Db/MariaDb/Entity/NginxDomain';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp';
import {NginxStream as NginxStreamDB} from '../../inc/Db/MariaDb/Entity/NginxStream';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * HostListen
 */
export type HostListen = {
    listen_id: number;
};

/**
 * HostData
 */
export type HostData = {
    id: number;
    domainname: string;
    links: HostListen[];
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
            const domains = await domainRepository.find();

            if (domains) {
                for (const adomain of domains) {
                    const linkList: HostListen[] = [];

                    const streams = await streamRepository.find({
                        where: {
                            domain_id: adomain.id
                        }
                    });

                    if (streams) {
                        for (const tstream of streams) {
                            linkList.push({
                                listen_id: tstream.listen_id
                            });
                        }
                    }

                    const https = await httpRepository.find({
                        where: {
                            domain_id: adomain.id
                        }
                    });

                    if (https) {
                        for (const thttp of https) {
                            linkList.push({
                                listen_id: thttp.listen_id
                            });
                        }
                    }

                    list.push({
                        id: adomain.id,
                        domainname: adomain.domainname,
                        links: linkList
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