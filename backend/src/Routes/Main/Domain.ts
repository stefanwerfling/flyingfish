import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain';
import {DomainRecord as DomainRecordDB} from '../../inc/Db/MariaDb/Entity/DomainRecord';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * DomainRecord
 */
export type DomainRecord = {
    id: number;
    type: number;
    class: number;
    ttl: number;
    value: string;
    update_by_dnsclient: boolean;
};

/**
 * DomainData
 */
export type DomainData = {
    id: number;
    name: string;
    fix: boolean;
    recordless: boolean;
    records: DomainRecord[];
};

/**
 * DomainResponse
 */
export type DomainResponse = {
    status: string;
    msg?: string;
    list: DomainData[];
};

/**
 * DomainSaveResponse
 */
export type DomainSaveResponse = {
    status: string;
    error?: string;
};

/**
 * DomainRecordSaveResponse
 */
export type DomainRecordSaveResponse = {
    status: string;
    error?: string;
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
    public async getDomains(@Session() session: any): Promise<DomainResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const domainRepository = MariaDbHelper.getRepository(DomainDB);
            const domainRecordRepository = MariaDbHelper.getRepository(DomainRecordDB);

            const domainList: DomainData[] = [];
            const domains = await domainRepository.find();

            for (const domain of domains) {
                const recordList: DomainRecord[] = [];

                const records = await domainRecordRepository.find({
                    where: {
                        domain_id: domain.id
                    }
                });

                for (const record of records) {
                    recordList.push({
                        id: record.id,
                        type: record.dtype,
                        class: record.dclass,
                        ttl: record.ttl,
                        value: record.dvalue,
                        update_by_dnsclient: record.update_by_dnsclient
                    });
                }

                domainList.push({
                    id: domain.id,
                    name: domain.domainname,
                    fix: domain.fixdomain,
                    recordless: domain.recordless,
                    records: recordList
                });
            }

            return {
                status: 'ok',
                list: domainList
            };
        }

        return {
            status: 'error',
            msg: 'Please login!',
            list: []
        };
    }

    /**
     * saveDomain
     * @param session
     * @param request
     */
    @Post('/json/domain/save')
    public async saveDomain(
        @Session() session: any,
        @Body() request: DomainData
    ): Promise<DomainSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const domainRepository = MariaDbHelper.getRepository(DomainDB);

            let aDomain: DomainDB|null = null;

            if (request.id !== 0) {
                const tDomain = await domainRepository.findOne({
                    where: {
                        id: request.id
                    }
                });

                if (tDomain) {
                    if (tDomain.fixdomain) {
                        return {
                            status: 'error',
                            error: `entry is not editable by id: ${request.id}`
                        };
                    }

                    aDomain = tDomain;
                } else {
                    return {
                        status: 'error',
                        error: `entry not found by id: ${request.id}`
                    };
                }
            }

            if (aDomain === null) {
                aDomain = new DomainDB();
            }

            aDomain.domainname = request.name;

            await MariaDbHelper.getConnection().manager.save(aDomain);

            return {
                status: 'ok'
            };
        }

        return {
            status: 'error',
            error: 'user not login!'
        };
    }

    /**
     * saveDomainRecord
     * @param session
     * @param request
     */
    @Post('/json/domain/record/save')
    public async saveDomainRecord(
        @Session() session: any,
        @Body() request: DomainRecord
    ): Promise<DomainRecordSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {

        }

        return {
            status: 'error',
            error: 'user not login!'
        };
    }

}