import {ExtractSchemaResultType} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * DomainSaveResponse
 */
export const SchemaDomainSaveResponse = SchemaDefaultReturn;

/**
 * DomainSaveResponse
 */
export type DomainSaveResponse = ExtractSchemaResultType<typeof SchemaDomainSaveResponse>;