import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * Nginx Domain Entity
 */
@Entity({name: 'nginx_domain'})
export class NginxDomain extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 512
    })
        // @ts-ignore
    domainname: string;

    @Index()
    @Column()
        // @ts-ignore
    listen_id: number;

}