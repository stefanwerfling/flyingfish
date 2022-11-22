import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Nginx Stream Entity
 */
@Entity({name: 'nginx_upstream'})
export class NginxUpstream extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column()
    public stream_id!: number;

    @Column({
        default: 0
    })
    public index!: number;

    @Column({
        type: 'varchar',
        length: 512
    })
    public destination_address!: string;

    @Column()
    public destination_port!: number;

    @Column({
        default: 0
    })
    public weight!: number;

    @Column({
        default: 0
    })
    public max_fails!: number;

    @Column({
        default: 0
    })
    public fail_timeout!: number;

}