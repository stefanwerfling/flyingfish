import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaFlyingFishArgsBase} from '../../Base/Env/Args.js';

/**
 * SchemaFlyingFishArgsSshServer
 */
export const SchemaFlyingFishArgsSshServer = SchemaFlyingFishArgsBase.extend({
    envargs: Vts.optional(Vts.string())
});

/**
 * FlyingFishArgsSshServer
 */
export type FlyingFishArgsSshServer = ExtractSchemaResultType<typeof SchemaFlyingFishArgsBase>;