import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * ip list maintainer
 */
@Entity({name: 'ip_list_maintainer'})
export class IpListMaintainer extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

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