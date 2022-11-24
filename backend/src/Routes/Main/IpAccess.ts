import {Get, JsonController} from 'routing-controllers-extended';

/**
 * IpAccess
 */
@JsonController()
export class IpAccess {

    /**
     * getBlackList
     */
    @Get('/json/ipaccess/blacklist')
    public async getBlackList(): Promise<null> {
        return null;
    }

}