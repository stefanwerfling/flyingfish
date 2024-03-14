import {NginxHttpVariableContextType} from 'flyingfish_schemas';
import {DBService} from '../DBService.js';
import {NginxHttpVariable} from '../Entity/NginxHttpVariable.js';

/**
 * Nginx http variable service object.
 */
export class NginxHttpVariableService extends DBService<NginxHttpVariable> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'nginx_http_variable';

    /**
     * Return an intance from nginx http variable service.
     * @returns {NginxHttpVariableService}
     */
    public static getInstance(): NginxHttpVariableService {
        return DBService.getSingleInstance(
            NginxHttpVariableService,
            NginxHttpVariable,
            NginxHttpVariableService.REGISTER_NAME
        );
    }

    /**
     * Find all nginx http variables by http id and context type.
     * @param {number} httpId
     * @param {NginxHttpVariableContextType} context_type
     * @returns {NginxHttpVariable[]}
     */
    public async findAllBy(httpId: number, context_type: NginxHttpVariableContextType): Promise<NginxHttpVariable[]> {
        return this._repository.find({
            where: {
                http_id: httpId,
                context_type: context_type
            }
        });
    }

    /**
     * Find an entry by http id, name and context type.
     * @param {number} httpId
     * @param {string} name
     * @param {NginxHttpVariableContextType} context_type
     * @returns {NginxHttpVariable|null}
     */
    public async findOneByName(httpId: number, name: string, context_type: NginxHttpVariableContextType): Promise<NginxHttpVariable|null> {
        return this._repository.findOne({
            where: {
                http_id: httpId,
                var_name: name,
                context_type: context_type
            }
        });
    }

}