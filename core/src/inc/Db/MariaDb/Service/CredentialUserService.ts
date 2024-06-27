import {DBService} from '../DBService.js';
import {CredentialUser} from '../Entity/CredentialUser.js';

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
     * Find user by credential id and username
     * @param {number} credentialId
     * @param {string} username
     * @param {boolean} disabled
     * @returns {CredentialUser|null}
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

    /**
     * Find all user by credential id
     * @param {number} credentialId
     * @returns {CredentialUser[]}
     */
    public async findUsers(credentialId: number): Promise<CredentialUser[]> {
        return this._repository.find({
            where: {
                credential_id: credentialId
            }
        });
    }

}