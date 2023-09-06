import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';

export class Save {

    public async saveUser(): Promise<DefaultReturn> {
        return {
            statusCode: StatusCodes.OK
        };
    }

}