import {Get, JsonController, Session} from 'routing-controllers';
import {NginxDomain as NginxDomainDB} from '../../inc/Db/MariaDb/Entity/NginxDomain';
import {NginxLink} from '../../inc/Db/MariaDb/Entity/NginxLink';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * DomainLink
 */
export type DomainLink = {
    listen_id: number;
};

/**
 * DomainData
 */
export type DomainData = {
    id: number;
    domainname: string;
    links: DomainLink[];
};

/**
 * DomainsResponse
 */
export type DomainsResponse = {
    status: string;
    msg?: string;
    list: DomainData[];
};

/**
 * Domain
 */
@JsonController()
export class Domain {

    /**
     * getDomains
     * @param session
     */
    @Get('/json/domain/list')
    public async getDomains(@Session() session: any): Promise<DomainsResponse> {
        const list: DomainData[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const domainRepository = MariaDbHelper.getRepository(NginxDomainDB);
            const linkRepository = MariaDbHelper.getRepository(NginxLink);

            const domains = await domainRepository.find();

            if (domains) {
                for (const adomain of domains) {
                    const links = await linkRepository.find({
                        where: {
                            domain_id: adomain.id
                        }
                    });

                    const linkList: DomainLink[] = [];

                    if (links) {
                        for (const tlink of links) {
                            linkList.push({
                                listen_id: tlink.listen_id
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