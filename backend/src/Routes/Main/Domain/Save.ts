import {DomainDB, DomainServiceDB} from 'flyingfish_core';
import {DomainData, DomainSaveResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * Save
 */
export class Save {

    /**
     * saveDomain
     * @param data
     */
    public static async saveDomain(data: DomainData): Promise<DomainSaveResponse> {
        let aDomain: DomainDB | null = null;

        if (data.id !== 0) {
            const tDomain = await DomainServiceDB.getInstance().findOne(data.id);

            if (tDomain) {
                if (tDomain.fixdomain) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: `entry is not editable by id: ${data.id}`
                    };
                }

                aDomain = tDomain;
            } else {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `entry not found by id: ${data.id}`
                };
            }
        }

        if (aDomain === null) {
            aDomain = new DomainDB();
        }

        aDomain.domainname = data.name.toLowerCase();
        aDomain.disable = data.disable;
        aDomain.parent_id = await DomainServiceDB.getInstance().findParentId(data.name.toLowerCase());

        aDomain = await DomainServiceDB.getInstance().save(aDomain);

        if (aDomain.parent_id !== 0) {
            await DomainServiceDB.getInstance().updateChildrenToNewParent(aDomain);
        }

        return {
            statusCode: StatusCodes.OK
        };
    }

}