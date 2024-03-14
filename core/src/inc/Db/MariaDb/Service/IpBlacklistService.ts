import {MoreThan, UpdateResult, DeleteResult} from 'typeorm';
import {DateHelper} from '../../../Utils/DateHelper.js';
import {DBService} from '../DBService.js';
import {IpBlacklist} from '../Entity/IpBlacklist.js';

/**
 * IP blacklist service object.
 */
export class IpBlacklistService extends DBService<IpBlacklist> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'ip_blacklist';

    /**
     * Return an intance from settings service.
     * @returns {NatPortService}
     */
    public static getInstance(): IpBlacklistService {
        return DBService.getSingleInstance(
            IpBlacklistService,
            IpBlacklist,
            IpBlacklistService.REGISTER_NAME
        );
    }

    /**
     * Find a blacklist entry by IP.
     * @param {string} ip - IP from entry.
     * @param {[boolean]} disabled - Optional, use for only disabled or not disabled IP.
     * @returns {IpBlacklist|null}
     */
    public async findByIp(ip: string, disabled?: boolean): Promise<IpBlacklist|null> {
        if (disabled !== undefined) {
            return this._repository.findOne({
                where: {
                    ip: ip,
                    disabled: disabled
                }
            });
        }

        return this._repository.findOne({
            where: {
                ip: ip
            }
        });
    }

    /**
     * Find all IP blocks by last block.
     * @param {boolean} withIpLocationEmpty - When is true, the list return only IP blocks without IP location.
     * @returns {IpBlacklist[]}
     */
    public async findAllLastBlock(withIpLocationEmpty: boolean = true): Promise<IpBlacklist[]> {
        if (withIpLocationEmpty) {
            return this._repository.find({
                where: {
                    count_block: MoreThan(0),
                    ip_location_id: 0
                }
            });
        }

        return this._repository.find({
            where: {
                count_block: MoreThan(0)
            }
        });
    }

    /**
     * Update an Entry in DB for Block (count and last block).
     * @param {number} id - ID of an Entry.
     * @param {number} count - New Block count.
     * @returns {UpdateResult}
     */
    public async updateBlock(id: number, count: number): Promise<UpdateResult> {
        return this._repository
        .createQueryBuilder()
        .update()
        .set({
            last_block: DateHelper.getCurrentDbTime(),
            count_block: count
        })
        .where('id = :id', {id: id})
        .execute();
    }

    /**
     * Find blacklist entry by ID and when this is not imported is (Entry created by user).
     * @param {number} id - ID of an Entry.
     * @returns {IpBlacklist|null}
     */
    public async findOwn(id: number): Promise<IpBlacklist|null> {
        return this._repository.findOne({
            where: {
                id: id,
                is_imported: false
            }
        });
    }

    /**
     * Remove an Entry by id and when this is not imported is (Entry created by user).
     * @param {number} id - ID of an Entry.
     * @returns {DeleteResult}
     */
    public async removeOwn(id: number): Promise<DeleteResult> {
        return this._repository.delete({
            id: id,
            is_imported: false
        });
    }

    /**
     * Find all own blacklist entries by sorting last block.
     * @param {string} orderLastblock
     * @returns {IpBlacklist[]}
     */
    public async findAllOwn(orderLastblock: string = 'DESC'): Promise<IpBlacklist[]> {
        return this._repository.find({
            where: {
                is_imported: false
            },
            order: {
                last_block: orderLastblock === 'DESC' ? 'DESC' : 'ASC'
            }
        });
    }

    /**
     * Find a blacklist entry by imported.
     * @param {number} id - ID of an entry.
     * @returns {IpBlacklist|null}
     */
    public async findImported(id: number): Promise<IpBlacklist|null> {
        return this._repository.findOne({
            where: {
                id: id,
                is_imported: true
            }
        });
    }

    /**
     * Find all imported entries of blacklist.
     * @param {number} limit
     * @param {string} orderLastblock
     * @returns {IpBlacklist[]}
     */
    public async findAllImported(limit: number, orderLastblock: string = 'DESC'): Promise<IpBlacklist[]> {
        return this._repository.find({
            take: limit,
            where: {
                is_imported: true
            },
            order: {
                last_block: orderLastblock === 'DESC' ? 'DESC' : 'ASC'
            }
        });
    }

    /**
     * Return the sum of all ip blocks.
     * @returns {number}
     */
    public async countBlocks(): Promise<number> {
        const count = await this._repository.createQueryBuilder('countipblocks')
        .select('SUM(countipblocks.count_block)', 'total_count_blocks')
        .addSelect('COUNT(*)', 'count')
        .getRawOne();

        if (count) {
            return parseInt(count.total_count_blocks, 10) ?? 0;
        }

        return 0;
    }

    /**
     * Find all blacklist entries sorted by last block.
     * @param {number} limit
     * @param {string} orderLastblock
     * @returns {IpBlacklist[]}
     */
    public async findAllSorted(limit: number, orderLastblock: string = 'DESC'): Promise<IpBlacklist[]> {
        return this._repository.find({
            take: limit,
            order: {
                last_block: orderLastblock === 'DESC' ? 'DESC' : 'ASC'
            }
        });
    }

}