import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Domain record Entity
 */
@Entity({name: 'domain_record'})
export class DomainRecord extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column()
    public domain_id!: number;

    @Index()
    @Column()
    public dtype!: number;

    @Index()
    @Column()
    public dclass!: number;

    @Column()
    public ttl!: number;

    @Column()
    public dvalue!: string;

    @Index()
    @Column()
    public update_by_dnsclient!: boolean;

    @Column({
        default: 0
    })
    public last_update!: number;

}