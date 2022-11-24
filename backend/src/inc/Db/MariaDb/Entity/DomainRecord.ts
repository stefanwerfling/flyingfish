import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Domain record Entity
 */
@Entity({name: 'domain_record'})
export class DomainRecord extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * domain id
     */
    @Index()
    @Column()
    public domain_id!: number;

    /**
     * dtype
     */
    @Index()
    @Column()
    public dtype!: number;

    /**
     * dclass
     */
    @Index()
    @Column()
    public dclass!: number;

    /**
     * ttl
     */
    @Column()
    public ttl!: number;

    /**
     * dvalue
     */
    @Column()
    public dvalue!: string;

    /**
     * update by dnsclient
     */
    @Index()
    @Column()
    public update_by_dnsclient!: boolean;

    /**
     * last update
     */
    @Column({
        default: 0
    })
    public last_update!: number;

}