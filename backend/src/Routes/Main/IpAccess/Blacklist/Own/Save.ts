import {DateHelper, IpBlacklistDB, IpBlacklistServiceDB} from 'flyingfish_core';
import {IpAccessBlackListOwnSaveRequest, IpAccessBlackListOwnSaveResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * Save
 */
export class Save {

    /**
     * saveBlackListOwn
     * @param data
     */
    public static async saveBlackListOwn(data: IpAccessBlackListOwnSaveRequest): Promise<IpAccessBlackListOwnSaveResponse> {
        let entrie = await IpBlacklistServiceDB.getInstance().findOwn(data.id);

        if (!entrie) {
            entrie = new IpBlacklistDB();
        }

        entrie.ip = data.ip;
        entrie.disabled = data.disabled;
        entrie.description = data.description;
        entrie.is_imported = false;
        entrie.last_update = DateHelper.getCurrentDbTime();

        await IpBlacklistServiceDB.getInstance().save(entrie);

        return {
            statusCode: StatusCodes.OK
        };
    }

}