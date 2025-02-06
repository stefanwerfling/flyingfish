import {DeleteResult, In} from 'typeorm';
import {DBService} from '../DBService.js';
import {Credential} from '../Entity/Credential.js';
import {CredentialLocationService} from './CredentialLocationService.js';

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
     * Return all credential by id list
     * @param {number[]} credIds
     * @returns {Credential[]}
     */
    public async findByIds(credIds: number[]): Promise<Credential[]> {
        return this._repository.find({
            where: {
                id: In(credIds)
            }
        });
    }

    /**
     * Remove a row (entry) by ID.
     * @param {number} id - ID from entry.
     * @returns {DeleteResult}
     */
    public override async remove(id: number): Promise<DeleteResult> {
        await CredentialLocationService.getInstance().removeByCredential(id);
        return super.remove(id);
    }

}