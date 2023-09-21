import {DateHelper, IpWhitelistDB, IpWhitelistServiceDB} from 'flyingfish_core';
import {IpAccessWhiteSaveRequest, IpAccessWhiteSaveResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * Save
 */
export class Save {

    /**
     * saveWhiteList
     * @param data
     */
    public static async saveWhiteList(data: IpAccessWhiteSaveRequest): Promise<IpAccessWhiteSaveResponse> {
        let entrie = await IpWhitelistServiceDB.getInstance().findOne(data.id);

        if (!entrie) {
            entrie = new IpWhitelistDB();
        }

        entrie.ip = data.ip;
        entrie.disabled = data.disabled;
        entrie.description = data.description;
        entrie.last_update = DateHelper.getCurrentDbTime();

        await IpWhitelistServiceDB.getInstance().save(entrie);

        return {
            statusCode: StatusCodes.OK
        };
    }

}