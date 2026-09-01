import {Logger} from 'figtree';
import {AcmeDnsTempRecordDB, AcmeDnsTempRecordServiceDB, DnsRecordBase, IDnsServer} from 'flyingfish_core';

/**
 * AcmeDnsTempStore
 *
 * DB-backed {@link IDnsServer} for the ACME DNS-01 challenge. The DNS server now
 * runs in its own container (roadmap 9.2.3), so the temporary
 * `_acme-challenge.<domain>` TXT records can no longer live in an in-process
 * map. This writes them to the shared `acme_dns_temp_record` table, which the
 * standalone DNS server reads at query time. Requires the database to be up
 * (SslCertService depends on `mariadb`).
 */
export class AcmeDnsTempStore implements IDnsServer {

    /**
     * instance
     * @private
     */
    private static _instance: AcmeDnsTempStore | null = null;

    /**
     * getInstance
     */
    public static getInstance(): AcmeDnsTempStore {
        if (AcmeDnsTempStore._instance === null) {
            AcmeDnsTempStore._instance = new AcmeDnsTempStore();
        }

        return AcmeDnsTempStore._instance;
    }

    /**
     * add a temporary domain with records
     * @param {string} domainName
     * @param {DnsRecordBase[]} records
     * @returns {Promise<boolean>}
     */
    public async addTempDomain(domainName: string, records: DnsRecordBase[]): Promise<boolean> {
        const service = AcmeDnsTempRecordServiceDB.getInstance();

        await Promise.all(records.map((record) => {
            const entity = new AcmeDnsTempRecordDB();
            entity.name = domainName;
            entity.dtype = record.type;
            entity.dclass = record.class;
            entity.ttl = record.ttl;
            entity.dvalue = record.data;

            return service.save(entity);
        }));

        Logger.getLogger().silly(
            'Add temp domain to shared store: %s (%d record(s))',
            domainName,
            records.length,
            {
                class: 'AcmeDnsTempStore::addTempDomain'
            }
        );

        return true;
    }

    /**
     * remove temporary domain
     * @param {string} domainName
     * @returns {Promise<boolean>}
     */
    public async removeTempDomain(domainName: string): Promise<boolean> {
        await AcmeDnsTempRecordServiceDB.getInstance().removeByName(domainName);

        Logger.getLogger().silly(
            'Remove temp domain from shared store: %s',
            domainName,
            {
                class: 'AcmeDnsTempStore::removeTempDomain'
            }
        );

        return true;
    }

}