import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../Core/Server/Routes/DefaultReturn.js';

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
export const SchemaDomainRecordDeleteResponse = SchemaDefaultReturn;

/**
 * DomainRecordDeleteResponse
 */
export type DomainRecordDeleteResponse = ExtractSchemaResultType<typeof SchemaDomainRecordDeleteResponse>;