import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Nginx Link Entity
 */
@Entity({name: 'nginx_link'})
export class NginxLink extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    listen_id: number;

    @Index()
    @Column()
        // @ts-ignore
    domain_id: number;

}