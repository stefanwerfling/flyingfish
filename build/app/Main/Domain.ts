import {Get, JsonController, Session} from 'routing-controllers';
import {NginxDomain as NginxDomainDB} from '../../inc/Db/MariaDb/Entity/NginxDomain';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * DomainData
 */
export type DomainData = {
    id: number;
    domainname: string;
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
            const domains = await domainRepository.find();

            if (domains) {
                for (const adomain of domains) {
                    list.push({
                        id: adomain.id,
                        domainname: adomain.domainname
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