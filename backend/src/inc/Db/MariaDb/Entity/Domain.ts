import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * Domain Entity
 */
@Entity({name: 'domain'})
export class Domain extends BaseEntity {

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

    @Column({
        default: false
    })
        // @ts-ignore
    fixdomain: boolean;

    @Column({
        default: false
    })
        // @ts-ignore
    recordless: boolean;

    /**
     * disable the listen
     */
    @Index()
    @Column({
        type: 'bool',
        default: false
    })
        // @ts-ignore
    disable: boolean;

}