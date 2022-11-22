import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * User Entity
 */
@Entity({name: 'user'})
export class User extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 128
    })
    public username!: string;

    @Column()
    public password!: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public email!: string;

    @Index()
    @Column({
        type: 'boolean',
        default: true
    })
    public disable!: boolean;

}