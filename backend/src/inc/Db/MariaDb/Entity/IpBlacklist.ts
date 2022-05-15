import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * ip blacklist Entity
 */
@Entity({name: 'ip_blacklist'})
export class IpBlacklist extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    ip: string;

    @Index()
    @Column()
        // @ts-ignore
    status: number;

}