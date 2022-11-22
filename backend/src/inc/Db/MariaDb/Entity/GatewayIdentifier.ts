import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Gateway Identifier Entity
 */
@Entity({name: 'gateway_identifier'})
export class GatewayIdentifier extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Column()
    public networkname!: string;

    @Column()
    public mac_address!: string;

    @Column({
        default: ''
    })
    public address!: string;

    @Column({
        default: ''
    })
    public color!: string;

}