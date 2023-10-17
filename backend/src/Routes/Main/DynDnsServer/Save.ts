import * as bcrypt from 'bcrypt';
import {
    DynDnsClientDomainServiceDB, DynDnsServerDomainDB,
    DynDnsServerDomainServiceDB,
    DynDnsServerUserDB,
    DynDnsServerUserServiceDB
} from 'flyingfish_core';
import {DefaultReturn, DynDnsServerData, StatusCodes} from 'flyingfish_schemas';

export class Save {

    public static async saveUser(data: DynDnsServerData): Promise<DefaultReturn> {
        let user: DynDnsServerUserDB|null = null;

        if (data.user.id > 0) {
            const tuser = await DynDnsServerUserServiceDB.getInstance().findOne(data.user.id);

            if (tuser) {
                user = tuser;
            }
        }

        if (user === null) {
            user = new DynDnsServerUserDB();
        }

        // check username only one exist -------------------------------------------------------------------------------

        const userByName = await DynDnsServerUserServiceDB.getInstance().findByName(data.user.username);

        if (userByName) {
            if ((data.user.id > 0) && (data.user.id !== userByName.id)) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Username is already in use.'
                };
            }
        }

        // -------------------------------------------------------------------------------------------------------------

        user.username = data.user.username;

        if (data.user.password && data.user.password !== '') {
            user.password = await bcrypt.hash(data.user.password, 10);
        }

        user = await DynDnsServerUserServiceDB.getInstance().save(user);

        if (user) {
            if (data.domains.length === 0) {
                await DynDnsServerDomainServiceDB.getInstance().removeByUserId(user.id);
            } else {
                const odomains = await DynDnsServerDomainServiceDB.getInstance().findByUser(user.id);

                if (odomains) {
                    const checkDomainExistence = (domainId: number): boolean => data.domains.some(({id}) => id ===
                        domainId);

                    for await (const oldDomain of odomains) {
                        if (!checkDomainExistence(oldDomain.domain_id)) {
                            await DynDnsServerDomainServiceDB.getInstance().remove(oldDomain.id);
                        }
                    }
                }

                // update or add ---------------------------------------------------------------------------------------

                for await (const domain of data.domains) {
                    let newDomain: DynDnsServerDomainDB|null = null;

                    const tdomain = await DynDnsServerDomainServiceDB.getInstance().findByDomainId(domain.id, user.id);

                    if (tdomain) {
                        newDomain = tdomain;
                    }

                    if (newDomain === null) {
                        newDomain = new DynDnsServerDomainDB();
                    }

                    newDomain.user_id = user.id;
                    newDomain.domain_id = domain.id;

                    await DynDnsServerDomainServiceDB.getInstance().save(newDomain);
                }
            }

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'User data can not save.'
        };
    }

}