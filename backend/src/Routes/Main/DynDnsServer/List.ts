import {DynDnsServerUserService} from 'flyingfish_core';

/**
 * List
 */
export class List {

    public static async getList(): Promise<void> {
        const users = await DynDnsServerUserService.findAll();

        if (users) {

        }
    }

}