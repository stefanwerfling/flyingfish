import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * Domain Entity
 */
@Entity({name: 'domain'})
export class Domain extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 512
    })
    public domainname!: string;

    @Column({
        default: false
    })
    public fixdomain!: boolean;

    @Column({
        default: false
    })
    public recordless!: boolean;

    /**
     * disable the listen
     */
    @Index()
    @Column({
        type: 'bool',
        default: false
    })
    public disable!: boolean;

}