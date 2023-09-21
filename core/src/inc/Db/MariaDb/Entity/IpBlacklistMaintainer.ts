import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * ip blacklist maintainer
 */
@Entity({name: 'ip_blacklist_maintainer'})
export class IpBlacklistMaintainer extends DBBaseEntityId {

    /**
     * ip id
     */
    @Index()
    @Column()
    public ip_id!: number;

    /**
     * ip maintainer id
     */
    @Index()
    @Column()
    public ip_maintainer_id!: number;

}