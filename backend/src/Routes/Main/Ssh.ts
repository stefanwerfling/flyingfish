import {Get, JsonController, Session} from 'routing-controllers-extended';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {SshPort as SshPortDB} from '../../inc/Db/MariaDb/Entity/SshPort.js';

/**
 * SshPortEntry
 */
export type SshPortEntry = {
    id: number;
    port: number;
};

/**
 * SshPortListResponse
 */
export type SshPortListResponse = {
    status: string;
    msg?: string;
    list: SshPortEntry[];
};

@JsonController()
export class Ssh {

    /**
     * getList
     * @param session
     */
    @Get('/json/ssh/list')
    public async getList(@Session() session: any): Promise<SshPortListResponse> {
        const list: SshPortEntry[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
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
        } else {
            return {
                status: 'error',
                msg: 'Please login first!',
                list: list
            };
        }

        return {
            status: 'ok',
            list: list
        };
    }

}