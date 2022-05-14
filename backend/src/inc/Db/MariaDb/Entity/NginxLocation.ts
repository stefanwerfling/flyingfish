import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * NginxLocation
 */
@Entity({name: 'nginx_location'})
export class NginxLocation extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    http_id: number;

    @Column()
        // @ts-ignore
    redirect_code: number;

    /**
     * redirect to url
     */
    @Column()
        // @ts-ignore
    redirect: string;

    @Column()
        // @ts-ignore
    match: string;

    @Column()
        // @ts-ignore
    modifier: string;

    @Column()
        // @ts-ignore
    proxy_pass: string;

}