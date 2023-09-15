import {DBBaseEntityId} from '../DBBaseEntityId.js';
import {Column, Entity, Index} from 'typeorm';

@Entity({name: 'ip_blacklist_category'})
export class IpBlacklistCategory extends DBBaseEntityId {

    /**
     * ip id
     */
    @Index()
    @Column()
    public ip_id!: number;

    /**
     * category number
     */
    @Index()
    @Column()
    public cat_num!: number;

}