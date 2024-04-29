import {DBService} from '../DBService.js';
import {CredentialLocation} from '../Entity/CredentialLocation.js';

export class CredentialLocationService extends DBService<CredentialLocation> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'credential_location';

    /**
     * getInstance
     */
    public static getInstance(): CredentialLocationService {
        return DBService.getSingleInstance(
            CredentialLocationService,
            CredentialLocation,
            CredentialLocationService.REGISTER_NAME
        );
    }

    /**
     * getListByLocation
     * @param {number} locationId
     * @returns {CredentialLocation[]}
     */
    public async getListByLocation(locationId: number): Promise<CredentialLocation[]> {
        return this._repository.find({
            where: {
                location_id: locationId
            },
            order: {
                position: 'ASC'
            }
        });
    }

}