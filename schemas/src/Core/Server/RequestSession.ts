import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaSessionUserData
 */
export const SchemaSessionUserData = Vts.object({
    isLogin: Vts.boolean(),
    userid: Vts.number()
});

/**
 * SessionUserData
 */
export type SessionUserData = ExtractSchemaResultType<typeof SchemaSessionUserData>;

/**
 * SchemaSessionData
 */
export const SchemaSessionData = Vts.object({
    id: Vts.string(),
    user: Vts.optional(SchemaSessionUserData)
}, {
    objectSchema: {
        ignoreAdditionalItems: true
    }
});

/**
 * SessionData
 */
export type SessionData = ExtractSchemaResultType<typeof SchemaSessionData>;

/**
 * SchemaRequestData
 */
export const SchemaRequestData = Vts.object({
    session: SchemaSessionData
}, {
    objectSchema: {
        ignoreAdditionalItems: true
    }
});

/**
 * RequestData
 */
export type RequestData = ExtractSchemaResultType<typeof SchemaRequestData>;