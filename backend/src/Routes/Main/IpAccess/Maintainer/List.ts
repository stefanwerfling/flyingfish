import {IpAccessMaintainer, IpAccessMaintainerResponse, StatusCodes} from 'flyingfish_schemas';
import {DBHelper} from '../../../../inc/Db/MariaDb/DBHelper.js';
import {IpListMaintainer as IpListMaintainerDB} from '../../../../inc/Db/MariaDb/Entity/IpListMaintainer.js';

/**
 * List
 */
export class List {

    /**
     * getMaintainerList
     */
    public static async getMaintainerList(): Promise<IpAccessMaintainerResponse> {
        const ipListMaintainerRepository = DBHelper.getRepository(IpListMaintainerDB);
        const maintainers = await ipListMaintainerRepository.find();

        const list: IpAccessMaintainer[] = [];

        for (const maintainer of maintainers) {
            list.push({
                id: maintainer.id,
                maintainer_name: maintainer.maintainer_name,
                maintainer_url: maintainer.maintainer_url,
                list_source_url: maintainer.list_source_url
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}