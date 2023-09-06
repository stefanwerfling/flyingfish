import {DBService} from './DBService.js';
import {CredentialUser} from './Entity/CredentialUser.js';

/**
 * CredentialUserService
 */
export class CredentialUserService extends DBService<CredentialUser> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'credential_user';

    /**
     * getInstance
     */
    public static getInstance(): CredentialUserService {
        return DBService.getSingleInstance(
            CredentialUserService,
            CredentialUser,
            CredentialUserService.REGISTER_NAME
        );
    }

    /**
     * findUser
     * @param credentialId
     * @param username
     * @param disabled
     */
    public async findUser(credentialId: number, username: string, disabled: boolean): Promise<CredentialUser|null> {
        return this._repository.findOne({
            where: {
                credential_id: credentialId,
                username: username,
                disabled: disabled
            }
        });
    }

}