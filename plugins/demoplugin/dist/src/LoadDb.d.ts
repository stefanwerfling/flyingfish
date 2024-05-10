import { ADBTableLoaderOnLoadEvent } from 'flyingfish_core';
import { EntitySchema } from 'typeorm';
export declare class LoadDb extends ADBTableLoaderOnLoadEvent {
    getName(): string;
    onRegisterEntities(): Promise<EntitySchema[]>;
}
