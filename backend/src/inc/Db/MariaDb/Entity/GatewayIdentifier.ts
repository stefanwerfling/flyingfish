import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Gateway Identifier Entity
 */
@Entity({name: 'gateway_identifier'})
export class GatewayIdentifier extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * networkname
     */
    @Column()
    public networkname!: string;

    /**
     * mac address
     */
    @Column()
    public mac_address!: string;

    /**
     * address
     */
    @Column({
        default: ''
    })
    public address!: string;

    /**
     * color
     */
    @Column({
        default: ''
    })
    public color!: string;

}