import {DeleteResult} from 'typeorm';
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
     * Find a credential location by ids
     * @param {number} locationId
     * @param {number} credentialId
     * @returns {CredentialLocation|null}
     */
    public async findBy(locationId: number, credentialId: number): Promise<CredentialLocation|null> {
        return this._repository.findOne({
            where: {
                credential_id: credentialId,
                location_id: locationId
            }
        });
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

    /**
     * remove all entries by location id
     * @param {number} locationId
     * @returns {DeleteResult}
     */
    public async removeByLoction(locationId: number): Promise<DeleteResult> {
        return this._repository.delete({
            location_id: locationId
        });
    }

    /**
     * Remove all entries by credential id
     * @param {number} credentialId
     * @returns {DeleteResult}
     */
    public async removeByCredential(credentialId: number): Promise<DeleteResult> {
        return this._repository.delete({
            credential_id: credentialId
        });
    }

}