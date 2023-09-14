import {IpBlacklistServiceDB} from 'flyingfish_core';
import {IpAccessBlackListImportSaveRequest, IpAccessBlackListImportSaveResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * Save
 */
export class Save {

    /**
     * saveBlackListImport
     * @param request
     */
    public static async saveBlackListImport(request: IpAccessBlackListImportSaveRequest): Promise<IpAccessBlackListImportSaveResponse> {
        const entrie = await IpBlacklistServiceDB.getInstance().findImported(request.id);

        if (entrie) {
            entrie.disabled = request.disabled;

            await IpBlacklistServiceDB.getInstance().save(entrie);

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'Entrie not found by id!'
        };
    }

}