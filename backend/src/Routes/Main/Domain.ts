import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain';
import {DomainRecord as DomainRecordDB} from '../../inc/Db/MariaDb/Entity/DomainRecord';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp';
import {NginxStream as NginxStreamDB} from '../../inc/Db/MariaDb/Entity/NginxStream';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {HowIsMyPublicIpService} from '../../inc/Service/HowIsMyPublicIpService';

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
    last_update: number;
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
    disable: boolean;
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
 * DomainDeleteResponse
 */
export type DomainDeleteResponse = {
    status: string;
    error?: string;
};

/**
 * DomainRecordSave
 */
export type DomainRecordSave = {
    domain_id: number;
    record: DomainRecord;
};

/**
 * DomainRecordSaveResponse
 */
export type DomainRecordSaveResponse = {
    status: string;
    error?: string;
};

/**
 * DomainRecordDeleteResponse
 */
export type DomainRecordDeleteResponse = {
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
                        update_by_dnsclient: record.update_by_dnsclient,
                        last_update: record.last_update
                    });
                }

                domainList.push({
                    id: domain.id,
                    name: domain.domainname,
                    fix: domain.fixdomain,
                    recordless: domain.recordless,
                    disable: domain.disable,
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
            aDomain.disable = request.disable;

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
     * deleteDomain
     * @param session
     * @param request
     */
    @Post('/json/domain/delete')
    public async deleteDomain(
        @Session() session: any,
        @Body() request: DomainData
    ): Promise<DomainDeleteResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const domainRepository = MariaDbHelper.getRepository(DomainDB);
            const domainRecordRepository = MariaDbHelper.getRepository(DomainRecordDB);
            const streamRepository = MariaDbHelper.getRepository(NginxStreamDB);
            const httpRepository = MariaDbHelper.getRepository(NginxHttpDB);

            const domain = await domainRepository.findOne({
                where: {
                    id: request.id
                }
            });

            if (domain) {
                if (domain.fixdomain) {
                    return {
                        status: 'error',
                        error: `domain is fix and can not delete by id: ${request.id}`
                    };
                }

                const countStreams = await streamRepository.count({
                    where: {
                        domain_id: domain.id
                    }
                });

                const countHttps = await httpRepository.count({
                    where: {
                        domain_id: domain.id
                    }
                });

                if ((countStreams > 0) || (countHttps > 0)) {
                    return {
                        status: 'error',
                        error: `domain in use, can not delete by id: ${request.id}`
                    };
                }

                await domainRecordRepository.delete({
                    domain_id: request.id
                });

                const result = await domainRepository.delete({
                    id: request.id
                });

                if (result) {
                    return {
                        status: 'ok'
                    };
                }
            } else {
                return {
                    status: 'error',
                    error: `domain not found by id: ${request.id}`
                };
            }
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
        @Body() request: DomainRecordSave
    ): Promise<DomainRecordSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const domainRecordRepository = MariaDbHelper.getRepository(DomainRecordDB);

            let aRecord: DomainRecordDB|null = null;

            if (request.record.id !== 0) {
                const tRecord = await domainRecordRepository.findOne({
                    where: {
                        id: request.record.id
                    }
                });

                if (tRecord) {
                    aRecord = tRecord;
                }
            }

            if (aRecord === null) {
                aRecord = new DomainRecordDB();
                aRecord.domain_id = request.domain_id;
            }

            aRecord.dtype = request.record.type;
            aRecord.dclass = request.record.class;
            aRecord.ttl = request.record.ttl;
            aRecord.dvalue = request.record.value;
            aRecord.update_by_dnsclient = request.record.update_by_dnsclient;

            // when update by dnsclient, then set value for ip by public ip
            if (aRecord.dvalue === '' && aRecord.update_by_dnsclient) {
                const publicIp = await HowIsMyPublicIpService.getInstance().getCurrentIp();

                if (publicIp) {
                    aRecord.dvalue = publicIp;
                }
            }

            await MariaDbHelper.getConnection().manager.save(aRecord);

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
     * deleteDomainRecord
     * @param session
     * @param request
     */
    @Post('/json/domain/record/delete')
    public async deleteDomainRecord(
        @Session() session: any,
        @Body() request: DomainRecord
    ): Promise<DomainRecordDeleteResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const domainRecordRepository = MariaDbHelper.getRepository(DomainRecordDB);

            const arecord = await domainRecordRepository.findOne({
                where: {
                    id: request.id
                }
            });

            if (arecord) {
                const result = await domainRecordRepository.delete({
                    id: request.id
                });

                if (result) {
                    return {
                        status: 'ok'
                    };
                }
            }

            return {
                status: 'error',
                error: `domain record not found by id: ${request.id}`
            };

        }

        return {
            status: 'error',
            error: 'user not login!'
        };
    }

}