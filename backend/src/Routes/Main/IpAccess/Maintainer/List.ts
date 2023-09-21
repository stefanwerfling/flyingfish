import {IpListMaintainerServiceDB} from 'flyingfish_core';
import {IpAccessMaintainer, IpAccessMaintainerResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * List
 */
export class List {

    /**
     * getMaintainerList
     */
    public static async getMaintainerList(): Promise<IpAccessMaintainerResponse> {
        const maintainers = await IpListMaintainerServiceDB.getInstance().findAll();

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