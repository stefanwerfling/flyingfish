import * as bcrypt from 'bcrypt';
import {
    DBHelper, NginxStreamDB,
    NginxStreamServiceDB,
    NginxUpstreamDB,
    NginxUpstreamServiceDB,
    SshPortDB,
    SshUserDB
} from 'flyingfish_core';
import {
    DefaultReturn,
    NginxStreamDestinationType, NginxStreamSshR,
    RouteStreamSave,
    RouteStreamSSH,
    StatusCodes
} from 'flyingfish_schemas';
import {NginxLocation as NginxLocationDB} from '../../../../inc/Db/MariaDb/Entity/NginxLocation.js';

/**
 * SaveStream
 */
export class Save {

    /**
     * _isSshPortUsed
     * @param tport
     * @param sshportid
     * @protected
     */
    protected static async _isSshPortUsed(tport: number, sshportid: number): Promise<boolean> {
        const sshportRepository = DBHelper.getRepository(SshPortDB);

        const sshport = await sshportRepository.findOne({
            where: {
                port: tport
            }
        });

        if (sshport) {
            if (sshport.id !== sshportid) {
                return true;
            }
        }

        return false;
    }

    /**
     * _getFreePort
     * @param tport
     * @protected
     */
    protected static async _getFreePort(tport: number = 10000): Promise<number> {
        const sshportRepository = DBHelper.getRepository(SshPortDB);
        const sshport = await sshportRepository.findOne({
            where: {
                port: tport
            }
        });

        if (sshport) {
            return Save._getFreePort(tport + 1);
        }

        return tport;
    }

    /**
     * removeOldSshPort
     * can only remove when nothing other entry it used
     * @param sshportId
     * @protected
     */
    public static async removeOldSshPort(sshportId: number): Promise<boolean> {
        const sshportRepository = DBHelper.getRepository(SshPortDB);
        const sshuserRepository = DBHelper.getRepository(SshUserDB);
        const locationRepository = DBHelper.getRepository(NginxLocationDB);

        // first check in used -----------------------------------------------------------------------------------------

        const usedCountStreamROut = await NginxStreamServiceDB.getInstance().countStreamOut(
            NginxStreamDestinationType.ssh_r,
            NginxStreamSshR.out,
            sshportId
        );

        const outUsedCountLoc = await locationRepository.count({
            where: {
                sshport_out_id: sshportId
            }
        });

        if ((usedCountStreamROut > 0) || (outUsedCountLoc > 0)) {
            return false;
        }

        // clean ssh port ----------------------------------------------------------------------------------------------

        const sshport = await sshportRepository.findOne({
            where: {
                id: sshportId
            }
        });

        if (sshport) {
            if (sshport.ssh_user_id > 0) {
                await sshuserRepository.delete({
                    id: sshport.ssh_user_id
                });
            }

            const result = await sshportRepository.delete({
                id: sshport.id
            });

            if (result) {
                return true;
            }
        }

        return false;
    }

    /**
     * _saveStreamSsh
     * @param ssh
     * @param dtype
     * @protected
     */
    protected static async _saveStreamSsh(ssh: RouteStreamSSH, dtype: NginxStreamDestinationType): Promise<number> {
        if (dtype !== NginxStreamDestinationType.ssh_r && dtype !== NginxStreamDestinationType.ssh_l) {
            throw Error('Is not a ssh type for save!');
        }

        const sshportRepository = DBHelper.getRepository(SshPortDB);
        const sshuserRepository = DBHelper.getRepository(SshUserDB);

        let sshuser: SshUserDB|null = null;
        let sshport: SshPortDB|null = null;

        if (ssh.user_id > 0) {
            const tsshuser = await sshuserRepository.findOne({
                where: {
                    id: ssh.user_id
                }
            });

            if (tsshuser) {
                sshuser = tsshuser;
            }
        }

        if (sshuser === null) {
            sshuser = new SshUserDB();
        }

        sshuser.username = ssh.username;

        if (ssh.password !== '') {
            sshuser.password = await bcrypt.hash(ssh.password, 10);
        }

        sshuser.disable = false;

        sshuser = await DBHelper.getDataSource().manager.save(sshuser);

        if (sshuser) {
            if (ssh.id > 0) {
                const tsshport = await sshportRepository.findOne({
                    where: {
                        id: ssh.id
                    }
                });

                if (tsshport) {
                    sshport = tsshport;
                }
            }

            if (sshport === null) {
                sshport = new SshPortDB();
            }

            if (dtype === NginxStreamDestinationType.ssh_r) {
                if (ssh.port === 0) {
                    sshport.port = await Save._getFreePort();
                } else {
                    if (await Save._isSshPortUsed(ssh.port, ssh.id)) {
                        throw Error('SSH Port is alrady in use!');
                    }

                    sshport.port = ssh.port;
                }
            } else {
                sshport.port = ssh.port;
            }

            sshport.ssh_user_id = sshuser.id;
            sshport.destinationAddress = ssh.destinationAddress;

            sshport = await DBHelper.getDataSource().manager.save(sshport);

            if (sshport) {
                return sshport.id;
            }

            throw Error('Can not save ssh port.');
        }

        throw Error('Can not save ssh user');
    }

    /**
     * saveStreamRoute
     * @param data
     */
    public static async saveStreamRoute(data: RouteStreamSave): Promise<DefaultReturn> {
        // check is listen select ----------------------------------------------------------------------------------

        if (data.stream.listen_id === 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Please select a listen!'
            };
        }

        // check is stream listen and domain already exist ---------------------------------------------------------

        const caStream = await NginxStreamServiceDB.getInstance().countStreamBy(
            data.stream.listen_id,
            data.domainid,
            data.stream.id
        );

        if (caStream > 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'You can only add one stream by this listen to this domain!'
            };
        }

        // ---------------------------------------------------------------------------------------------------------

        let aStream: NginxStreamDB|null = null;

        if (data.stream.id !== 0) {
            const tStream = await NginxStreamServiceDB.getInstance().findOne(data.stream.id);

            if (tStream) {
                if (tStream.isdefault) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: `stream can not edit, this is a default route by id: ${data.stream.id}`
                    };
                }

                aStream = tStream;
            } else {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `entry not found by id: ${data.stream.id}`
                };
            }
        }

        if (aStream === null) {
            aStream = new NginxStreamDB();
        }

        aStream.domain_id = data.domainid;
        aStream.listen_id = data.stream.listen_id;
        aStream.alias_name = data.stream.alias_name;
        aStream.index = 0;

        if (data.stream.index > 0) {
            aStream.index = data.stream.index;
        }

        aStream.destination_type = data.stream.destination_type;
        aStream.destination_listen_id = data.stream.destination_listen_id;
        aStream.use_as_default = data.stream.use_as_default;
        aStream.load_balancing_algorithm = data.stream.load_balancing_algorithm;
        aStream.ssh_r_type = NginxStreamSshR.none;
        aStream.sshport_id = 0;

        if (data.stream.ssh) {
            switch (aStream.destination_type) {

                // ssh r -------------------------------------------------------------------------------------------
                case NginxStreamDestinationType.ssh_r:
                    aStream.ssh_r_type = data.stream.ssh_r_type;

                    switch (aStream.ssh_r_type) {

                        // ssh r in --------------------------------------------------------------------------------
                        case NginxStreamSshR.in:
                            try {
                                aStream.sshport_id = await Save._saveStreamSsh(
                                    data.stream.ssh,
                                    NginxStreamDestinationType.ssh_r
                                );
                            } catch (e) {
                                return {
                                    statusCode: StatusCodes.INTERNAL_ERROR,
                                    msg: (e as Error).message
                                };
                            }
                            break;

                        // ssh r out -------------------------------------------------------------------------------
                        case NginxStreamSshR.out:
                            aStream.sshport_id = data.stream.ssh.id;
                            break;
                    }

                    break;

                // ssh l -------------------------------------------------------------------------------------------
                case NginxStreamDestinationType.ssh_l:
                    try {
                        aStream.sshport_id = await Save._saveStreamSsh(
                            data.stream.ssh,
                            NginxStreamDestinationType.ssh_l
                        );
                    } catch (e) {
                        return {
                            statusCode: StatusCodes.INTERNAL_ERROR,
                            msg: (e as Error).message
                        };
                    }
                    break;
            }
        } else {
            // remove old ssh in -----------------------------------------------------------------------------------
            if (aStream.sshport_id > 0 && aStream.ssh_r_type !== NginxStreamSshR.out) {
                if (!await Save.removeOldSshPort(aStream.sshport_id)) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'SSH Server is currently in use, please remove SSH port outgoning link!'
                    };
                }
            }

            // remove old ssh out ----------------------------------------------------------------------------------

            if (aStream.sshport_id > 0) {
                aStream.sshport_id = 0;
            }
        }

        aStream = await NginxStreamServiceDB.getInstance().save(aStream);

        if (aStream.destination_listen_id > 0) {
            // clear old upstreams
            await NginxUpstreamServiceDB.getInstance().removeAllStreams(aStream.id);
        } else if (data.stream.upstreams.length > 0) {
            // remove delete upstreams -----------------------------------------------------------------------------
            const tupstreams = await NginxUpstreamServiceDB.getInstance().findAllStreams(aStream.id);

            if (tupstreams) {
                const checkUpstreamExistence = (upstreamId: number): boolean => data.stream.upstreams.some(({id}) => id === upstreamId);

                for await (const oldUpstream of tupstreams) {
                    if (!checkUpstreamExistence(oldUpstream.id)) {
                        await NginxUpstreamServiceDB.getInstance().remove(oldUpstream.id);
                    }
                }
            }

            // update or add new upstreams -------------------------------------------------------------------------
            let index = 0;

            for await (const aUpstream of data.stream.upstreams) {
                let aNewUpstream: NginxUpstreamDB|null = null;

                if (aUpstream.id > 0) {
                    const tUpstream = await NginxUpstreamServiceDB.getInstance().findOne(aUpstream.id);

                    if (tUpstream) {
                        aNewUpstream = tUpstream;
                    }
                }

                if (aNewUpstream === null) {
                    aNewUpstream = new NginxUpstreamDB();
                    aNewUpstream.stream_id = aStream.id;
                }

                aNewUpstream.destination_address = aUpstream.address;
                aNewUpstream.destination_port = aUpstream.port;
                aNewUpstream.index = index;
                aNewUpstream.proxy_protocol_out = aUpstream.proxy_protocol_out;

                await NginxUpstreamServiceDB.getInstance().save(aNewUpstream);

                index++;
            }
        }

        return {
            statusCode: StatusCodes.OK
        };
    }

}