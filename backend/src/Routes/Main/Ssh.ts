import {Get, JsonController, Session} from 'routing-controllers';
import {SshPort as SshPortDB} from '../../inc/Db/MariaDb/Entity/SshPort';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

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
            const sshPortRepository = MariaDbHelper.getRepository(SshPortDB);
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
                list
            };
        }

        return {
            status: 'ok',
            list
        };
    }

}