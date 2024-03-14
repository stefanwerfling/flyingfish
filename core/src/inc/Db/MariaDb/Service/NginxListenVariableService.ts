import {NginxListenVariableContextType} from 'flyingfish_schemas';
import {DBService} from '../DBService.js';
import {NginxListenVariable} from '../Entity/NginxListenVariable.js';

/**
 * Nginx listen varible service
 */
export class NginxListenVariableService extends DBService<NginxListenVariable> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'nginx_listen_variable';

    /**
     * Return an intance from nginx http variable service.
     * @returns {NginxHttpVariableService}
     */
    public static getInstance(): NginxListenVariableService {
        return DBService.getSingleInstance(
            NginxListenVariableService,
            NginxListenVariable,
            NginxListenVariableService.REGISTER_NAME
        );
    }

    /**
     * Find all nginx listen variables by http id and context type.
     * @param {number} listenId
     * @param {NginxListenVariableContextType} context_type
     * @returns {NginxHttpVariable[]}
     */
    public async findAllBy(listenId: number, context_type: NginxListenVariableContextType): Promise<NginxListenVariable[]> {
        return this._repository.find({
            where: {
                listen_id: listenId,
                context_type: context_type
            }
        });
    }

    /**
     * Find an entry by listen id, name and context type.
     * @param {number} listenId
     * @param {string} name
     * @param {NginxListenVariableContextType} context_type
     * @returns {NginxHttpVariable|null}
     */
    public async findOneByName(listenId: number, name: string, context_type: NginxListenVariableContextType): Promise<NginxListenVariable|null> {
        return this._repository.findOne({
            where: {
                listen_id: listenId,
                var_name: name,
                context_type: context_type
            }
        });
    }

}