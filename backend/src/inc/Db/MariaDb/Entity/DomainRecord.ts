import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Domain record Entity
 */
@Entity({name: 'domain_record'})
export class DomainRecord extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    domain_id: number;

    @Index()
    @Column()
        // @ts-ignore
    dtype: number;

    @Index()
    @Column()
        // @ts-ignore
    dclass: number;

    @Column()
        // @ts-ignore
    ttl: number;

    @Column()
        // @ts-ignore
    dvalue: string;

    @Index()
    @Column()
        // @ts-ignore
    update_by_dnsclient: boolean;

    @Column({
        default: 0
    })
        // @ts-ignore
    last_update: number;

}