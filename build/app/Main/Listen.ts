import {Get, JsonController, Session} from 'routing-controllers';
import {NginxListen as NginxListenDB} from '../../inc/Db/MariaDb/Entity/NginxListen';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * ListenData
 */
export type ListenData = {
    id: number;
    type: number;
    port: number;
    enable_ipv6: boolean;
    name: string;
    description: string;
};

/**
 * ListenResponse
 */
export type ListenResponse = {
    status: string;
    msg?: string;
    list: ListenData[];
};

/**
 * Listen
 */
@JsonController()
export class Listen {

    /**
     * getListens
     * @param session
     */
    @Get('/json/listen/list')
    public async getListens(@Session() session: any): Promise<ListenResponse> {
        const list: ListenData[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const listenRepository = MariaDbHelper.getRepository(NginxListenDB);

            const listens = await listenRepository.find();

            if (listens) {
                for (const listen of listens) {
                    list.push({
                        id: listen.id,
                        type: listen.listen_type,
                        port: listen.listen_port,
                        enable_ipv6: listen.enable_ipv6,
                        name: listen.name,
                        description: listen.description
                    });
                }
            }
        }

        return {
            status: 'ok',
            list
        };
    }

}