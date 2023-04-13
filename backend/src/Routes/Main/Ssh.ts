import {Router} from 'express';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {SshPort as SshPortDB} from '../../inc/Db/MariaDb/Entity/SshPort.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {DefaultRoute} from '../../inc/Routes/DefaultRoute.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';

/**
 * SshPortEntry
 */
export const SchemaSshPortEntry = Vts.object({
    id: Vts.number(),
    port: Vts.number()
});

export type SshPortEntry = ExtractSchemaResultType<typeof SchemaSshPortEntry>;

/**
 * SshPortListResponse
 */
export type SshPortListResponse = DefaultReturn & {
    list: SshPortEntry[];
};

/**
 * Ssh
 */
export class Ssh extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getList
     */
    public async getList(): Promise<SshPortListResponse> {
        const list: SshPortEntry[] = [];

        const sshPortRepository = DBHelper.getRepository(SshPortDB);
        const sshports = await sshPortRepository.find();

        if (sshports) {
            for (const asshport of sshports) {
                list.push({
                    id: asshport.id,
                    port: asshport.port
                });
            }
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/ssh/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getList());
                }
            }
        );

        return super.getExpressRouter();
    }

}