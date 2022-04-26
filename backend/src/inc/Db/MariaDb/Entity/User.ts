import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * User Entity
 */
@Entity({name: 'user'})
export class User extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 128
    })
        // @ts-ignore
    username: string;

    @Column()
        // @ts-ignore
    password: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
        // @ts-ignore
    email: string;

    @Index()
    @Column({
        type: 'boolean',
        default: true
    })
        // @ts-ignore
    disable: boolean;

}