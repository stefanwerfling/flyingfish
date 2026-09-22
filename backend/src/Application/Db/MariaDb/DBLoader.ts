import {DBLoader as CoreDBLoader, DBLoaderType} from '@stefanwerfling/figtree';
import {DBEntitiesLoader} from 'flyingfish_core';
import {AddAcmeDnsTempRecord1788400000000} from '../../../inc/Db/MariaDb/migrations/1788400000000-AddAcmeDnsTempRecord.js';
import {AddDomainClusterPriority1788700000000} from '../../../inc/Db/MariaDb/migrations/1788700000000-AddDomainClusterPriority.js';
import {AddPkiRevocation1788600000000} from '../../../inc/Db/MariaDb/migrations/1788600000000-AddPkiRevocation.js';
import {AddRbacTables1788800000000} from '../../../inc/Db/MariaDb/migrations/1788800000000-AddRbacTables.js';
import {AddRouterTables1788900000000} from '../../../inc/Db/MariaDb/migrations/1788900000000-AddRouterTables.js';
import {AddWanLease1789000000000} from '../../../inc/Db/MariaDb/migrations/1789000000000-AddWanLease.js';
import {AddDhcpPerInterface1789100000000} from '../../../inc/Db/MariaDb/migrations/1789100000000-AddDhcpPerInterface.js';
import {FixPkiTimestampsBigint1789200000000} from '../../../inc/Db/MariaDb/migrations/1789200000000-FixPkiTimestampsBigint.js';
import {AddNatPerInterface1789300000000} from '../../../inc/Db/MariaDb/migrations/1789300000000-AddNatPerInterface.js';
import {AddPortForward1789400000000} from '../../../inc/Db/MariaDb/migrations/1789400000000-AddPortForward.js';
import {AddSystemConfig1789500000000} from '../../../inc/Db/MariaDb/migrations/1789500000000-AddSystemConfig.js';
import {AddPkiTables1788500000000} from '../../../inc/Db/MariaDb/migrations/1788500000000-AddPkiTables.js';
import {InitialSchema1787961600000} from '../../../inc/Db/MariaDb/migrations/1787961600000-InitialSchema.js';

/**
 * DBLoader
 *
 * Supplies the entity list and migrations to figtree's `MariaDBService`.
 * The entities are still sourced from `flyingfish_core` (`DBEntitiesLoader`)
 * during the strangler migration; only the loading seam moves to figtree.
 */
export class DBLoader extends CoreDBLoader {

    /**
     * Load the FlyingFish entities.
     * @return {ReturnType<DBLoaderType['loadEntities']>}
     */
    public static override async loadEntities(): ReturnType<DBLoaderType['loadEntities']> {
        return DBEntitiesLoader.loadEntities() as ReturnType<DBLoaderType['loadEntities']>;
    }

    /**
     * Load the FlyingFish migrations. `InitialSchema` is the consolidated
     * baseline of the whole schema; further migrations append here.
     * @return {ReturnType<DBLoaderType['loadMigrations']>}
     */
    public static override loadMigrations(): ReturnType<DBLoaderType['loadMigrations']> {
        return [
            InitialSchema1787961600000,
            AddAcmeDnsTempRecord1788400000000,
            AddPkiTables1788500000000,
            AddPkiRevocation1788600000000,
            AddDomainClusterPriority1788700000000,
            AddRbacTables1788800000000,
            AddRouterTables1788900000000,
            AddWanLease1789000000000,
            AddDhcpPerInterface1789100000000,
            FixPkiTimestampsBigint1789200000000,
            AddNatPerInterface1789300000000,
            AddPortForward1789400000000,
            AddSystemConfig1789500000000
        ];
    }

}