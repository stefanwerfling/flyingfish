import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaDomainRecord} from '../List.js';

/**
 * DomainRecordSave
 */
export const SchemaDomainRecordSave = Vts.object({
    domain_id: Vts.number(),
    record: SchemaDomainRecord
});

/**
 * DomainRecordSave
 */
export type DomainRecordSave = ExtractSchemaResultType<typeof SchemaDomainRecordSave>;

/**
 * SchemaDomainRecordSaveResponse
 */
export const SchemaDomainRecordSaveResponse = SchemaDefaultReturn;

/**
 * DomainRecordSaveResponse
 */
export type DomainRecordSaveResponse = ExtractSchemaResultType<typeof SchemaDomainRecordSaveResponse>;