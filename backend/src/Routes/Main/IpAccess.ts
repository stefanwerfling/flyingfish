import {Get, JsonController, Session} from 'routing-controllers-extended';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {IpBlacklistCategory as IpBlacklistCategoryDB} from '../../inc/Db/MariaDb/Entity/IpBlacklistCategory.js';
import {IpBlacklistMaintainer as IpBlacklistMaintainerDB} from '../../inc/Db/MariaDb/Entity/IpBlacklistMaintainer.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';

/**
 * IpAccessBlackListImport
 */
export type IpAccessBlackListImport = {
    id: number;
    ip: string;
    last_update: number;
    disable: boolean;
    last_block: number;
    count_block: number;
    categorys: number[];
    maintainers: number[];
};

/**
 * IpAccessBlackListImportsResponse
 */
export type IpAccessBlackListImportsResponse = DefaultReturn & {
    list?: IpAccessBlackListImport[];
};

/**
 * IpAccess
 */
@JsonController()
export class IpAccess {

    /**
     * getBlackList
     */
    @Get('/json/ipaccess/blacklist/imports')
    public async getBlackListImports(@Session() session: any): Promise<IpAccessBlackListImportsResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);
            const ipBlacklistCategoryRepository = DBHelper.getRepository(IpBlacklistCategoryDB);
            const ipBlacklistMaintainerRepository = DBHelper.getRepository(IpBlacklistMaintainerDB);

            const entries = await ipBlacklistRepository.find({
                take: 20,
                where: {
                    is_imported: true
                },
                order: {
                    last_update: 'DESC'
                }
            });

            const list: IpAccessBlackListImport[] = [];

            if (entries) {
                for await (const entry of entries) {
                    const categorys: number[] = [];
                    const maintainers: number[] = [];

                    const cats = await ipBlacklistCategoryRepository.find({
                        where: {
                            ip_id: entry.id
                        }
                    });

                    if (cats) {
                        for (const cat of cats) {
                            categorys.push(cat.cat_num);
                        }
                    }

                    const maints = await ipBlacklistMaintainerRepository.find({
                        where: {
                            ip_id: entry.id
                        }
                    });

                    if (maints) {
                        for (const maint of maints) {
                            maintainers.push(maint.ip_maintainer_id);
                        }
                    }

                    list.push({
                        id: entry.id,
                        ip: entry.ip,
                        disable: entry.disable,
                        last_update: entry.last_update,
                        last_block: entry.last_block,
                        count_block: entry.count_block,
                        categorys: categorys,
                        maintainers: maintainers
                    });
                }
            }

            return {
                statusCode: StatusCodes.OK,
                list: list
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}