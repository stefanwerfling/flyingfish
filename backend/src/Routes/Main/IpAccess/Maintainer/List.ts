import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../../inc/Db/MariaDb/DBHelper.js';
import {IpListMaintainer as IpListMaintainerDB} from '../../../../inc/Db/MariaDb/Entity/IpListMaintainer.js';

/**
 * IpAccessMaintainer
 */
export const SchemaIpAccessMaintainer = Vts.object({
    id: Vts.number(),
    maintainer_name: Vts.string(),
    maintainer_url: Vts.string(),
    list_source_url: Vts.string()
});

export type IpAccessMaintainer = ExtractSchemaResultType<typeof SchemaIpAccessMaintainer>;

/**
 * IpAccessMaintainerResponse
 */
export type IpAccessMaintainerResponse = DefaultReturn & {
    list?: IpAccessMaintainer[];
};

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