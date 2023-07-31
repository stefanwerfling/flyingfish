import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * User Entity
 */
@Entity({name: 'user'})
export class User extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * username
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 128
    })
    public username!: string;

    /**
     * password
     */
    @Column()
    public password!: string;

    /**
     * email
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public email!: string;

    /**
     * disable
     */
    @Index()
    @Column({
        type: 'boolean',
        default: true
    })
    public disable!: boolean;

}