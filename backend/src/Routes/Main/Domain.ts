import {Router} from 'express';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain.js';
import {DomainRecord as DomainRecordDB} from '../../inc/Db/MariaDb/Entity/DomainRecord.js';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp.js';
import {NginxStream as NginxStreamDB} from '../../inc/Db/MariaDb/Entity/NginxStream.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {DefaultRoute} from '../../inc/Routes/DefaultRoute.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';
import {HowIsMyPublicIpService} from '../../inc/Service/HowIsMyPublicIpService.js';

/**
 * DomainRecord
 */
export const SchemaDomainRecord = Vts.object({
    id: Vts.number(),
    type: Vts.number(),
    class: Vts.number(),
    ttl: Vts.number(),
    value: Vts.string(),
    update_by_dnsclient: Vts.boolean(),
    last_update: Vts.number()
});

export type DomainRecord = ExtractSchemaResultType<typeof SchemaDomainRecord>;

/**
 * DomainData
 */
export const SchemaDomainData = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
    fix: Vts.boolean(),
    recordless: Vts.boolean(),
    records: Vts.array(SchemaDomainRecord),
    disable: Vts.boolean()
});

export type DomainData = ExtractSchemaResultType<typeof SchemaDomainData>;

/**
 * DomainResponse
 */
export type DomainResponse = DefaultReturn & {
    list?: DomainData[];
};

/**
 * DomainSaveResponse
 */
export type DomainSaveResponse = DefaultReturn;

/**
 * DomainDeleteResponse
 */
export type DomainDeleteResponse = DefaultReturn;

/**
 * DomainRecordSave
 */
export const SchemaDomainRecordSave = Vts.object({
    domain_id: Vts.number(),
    record: SchemaDomainRecord
});

export type DomainRecordSave = ExtractSchemaResultType<typeof SchemaDomainRecordSave>;

/**
 * DomainRecordSaveResponse
 */
export type DomainRecordSaveResponse = DefaultReturn;

/**
 * DomainRecordDelete
 */
export const SchemaDomainRecordDelete = Vts.object({
    id: Vts.number()
});

export type DomainRecordDelete = ExtractSchemaResultType<typeof SchemaDomainRecordDelete>;

/**
 * DomainRecordDeleteResponse
 */
export type DomainRecordDeleteResponse = DefaultReturn;

export const SchemaDomainDelete = Vts.object({
    id: Vts.number()
});

export type DomainDelete = ExtractSchemaResultType<typeof SchemaDomainDelete>;

/**
 * Domain
 */
export class Domain extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getDomains
     */
    public async getDomains(): Promise<DomainResponse> {
        const domainRepository = DBHelper.getRepository(DomainDB);
        const domainRecordRepository = DBHelper.getRepository(DomainRecordDB);

        const domainList: DomainData[] = [];
        const domains = await domainRepository.find();

        for await (const domain of domains) {
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
            statusCode: StatusCodes.OK,
            list: domainList
        };
    }

    /**
     * saveDomain
     * @param data
     */
    public async saveDomain(data: DomainData): Promise<DomainSaveResponse> {
        const domainRepository = DBHelper.getRepository(DomainDB);

        let aDomain: DomainDB | null = null;

        if (data.id !== 0) {
            const tDomain = await domainRepository.findOne({
                where: {
                    id: data.id
                }
            });

            if (tDomain) {
                if (tDomain.fixdomain) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: `entry is not editable by id: ${data.id}`
                    };
                }

                aDomain = tDomain;
            } else {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `entry not found by id: ${data.id}`
                };
            }
        }

        if (aDomain === null) {
            aDomain = new DomainDB();
        }

        aDomain.domainname = data.name;
        aDomain.disable = data.disable;

        await DBHelper.getDataSource().manager.save(aDomain);

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * deleteDomain
     * @param data
     */
    public async deleteDomain(data: DomainDelete): Promise<DomainDeleteResponse> {
        const domainRepository = DBHelper.getRepository(DomainDB);
        const domainRecordRepository = DBHelper.getRepository(DomainRecordDB);
        const streamRepository = DBHelper.getRepository(NginxStreamDB);
        const httpRepository = DBHelper.getRepository(NginxHttpDB);

        const domain = await domainRepository.findOne({
            where: {
                id: data.id
            }
        });

        if (domain) {
            if (domain.fixdomain) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `domain is fix and can not delete by id: ${data.id}`
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
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `domain in use, can not delete by id: ${data.id}`
                };
            }

            await domainRecordRepository.delete({
                domain_id: data.id
            });

            const result = await domainRepository.delete({
                id: data.id
            });

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: `domain not found by id: ${data.id}`
        };
    }

    /**
     * saveDomainRecord
     * @param data
     */
    public async saveDomainRecord(data: DomainRecordSave): Promise<DomainRecordSaveResponse> {
        const domainRecordRepository = DBHelper.getRepository(DomainRecordDB);

        let aRecord: DomainRecordDB | null = null;

        if (data.record.id !== 0) {
            const tRecord = await domainRecordRepository.findOne({
                where: {
                    id: data.record.id
                }
            });

            if (tRecord) {
                aRecord = tRecord;
            }
        }

        if (aRecord === null) {
            aRecord = new DomainRecordDB();
            aRecord.domain_id = data.domain_id;
        }

        aRecord.dtype = data.record.type;
        aRecord.dclass = data.record.class;
        aRecord.ttl = data.record.ttl;
        aRecord.dvalue = data.record.value;
        aRecord.update_by_dnsclient = data.record.update_by_dnsclient;

        // when update by dnsclient, then set value for ip by public ip
        if (aRecord.dvalue === '' && aRecord.update_by_dnsclient) {
            const publicIp = await HowIsMyPublicIpService.getInstance().getCurrentIp();

            if (publicIp) {
                aRecord.dvalue = publicIp;
            }
        }

        await DBHelper.getDataSource().manager.save(aRecord);

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * deleteDomainRecord
     * @param data
     */
    public async deleteDomainRecord(data: DomainRecordDelete): Promise<DomainRecordDeleteResponse> {
        const domainRecordRepository = DBHelper.getRepository(DomainRecordDB);

        const arecord = await domainRecordRepository.findOne({
            where: {
                id: data.id
            }
        });

        if (arecord) {
            const result = await domainRecordRepository.delete({
                id: data.id
            });

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: `domain record not found by id: ${data.id}`
        };
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/domain/list',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getDomains());
                }
            }
        );

        this._routes.post(
            '/json/domain/save',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDomainData, req.body, res)) {
                        res.status(200).json(await this.saveDomain(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/domain/delete',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDomainDelete, req.body, res)) {
                        res.status(200).json(await this.deleteDomain(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/domain/record/save',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDomainRecordSave, req.body, res)) {
                        res.status(200).json(await this.saveDomainRecord(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/domain/record/delete',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDomainRecordDelete, req.body, res)) {
                        res.status(200).json(await this.deleteDomainRecord(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}