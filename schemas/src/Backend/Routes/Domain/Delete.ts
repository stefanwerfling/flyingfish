import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaDomainDelete
 */
export const SchemaDomainDelete = Vts.object({
    id: Vts.number()
});

export type DomainDelete = ExtractSchemaResultType<typeof SchemaDomainDelete>;

/**
 * SchemaDomainDeleteResponse
 */
export const SchemaDomainDeleteResponse = SchemaDefaultReturn;

/**
 * DomainDeleteResponse
 */
export type DomainDeleteResponse = ExtractSchemaResultType<typeof SchemaDomainDeleteResponse>;