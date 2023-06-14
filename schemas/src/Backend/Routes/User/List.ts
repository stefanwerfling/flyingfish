import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaUserEntry
 */
export const SchemaUserEntry = Vts.object({
    id: Vts.number(),
    username: Vts.string(),
    password: Vts.optional(Vts.string()),
    password_repeat: Vts.optional(Vts.string()),
    email: Vts.string(),
    disable: Vts.boolean()
});

/**
 * UserEntry
 */
export type UserEntry = ExtractSchemaResultType<typeof SchemaUserEntry>;

/**
 * SchemaUserListResponse
 */
export const SchemaUserListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaUserEntry)
});

/**
 * UserListResponse
 */
export type UserListResponse = ExtractSchemaResultType<typeof SchemaUserListResponse>;