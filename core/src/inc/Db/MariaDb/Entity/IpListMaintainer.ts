import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * ip list maintainer
 */
@Entity({name: 'ip_list_maintainer'})
export class IpListMaintainer extends DBBaseEntityId {

    /**
     * maintainer name
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 200
    })
    public maintainer_name!: string;

    /**
     * maintainer url
     */
    @Column()
    public maintainer_url!: string;

    /**
     * list source url
     */
    @Column()
    public list_source_url!: string;

}