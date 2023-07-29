import {BaseEntity, PrimaryGeneratedColumn} from 'typeorm';

/**
 * DBBaseEntityUnid
 */
export class DBBaseEntityUnid extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn('uuid')
    public unid!: string;

}