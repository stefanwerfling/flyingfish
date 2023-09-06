import {DBService} from './DBService.js';
import {Credential} from './Entity/Credential.js';

/**
 * CredentialService
 */
export class CredentialService extends DBService<Credential> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'credential';

    /**
     * getInstance
     */
    public static getInstance(): CredentialService {
        return DBService.getSingleInstance(
            CredentialService,
            Credential,
            CredentialService.REGISTER_NAME
        );
    }

    /**
     * getListByLocation
     * @param locationId
     */
    public async getListByLocation(locationId: number): Promise<Credential[]> {
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