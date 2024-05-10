import { ADBTableLoaderOnLoadEvent } from 'flyingfish_core';
export class LoadDb extends ADBTableLoaderOnLoadEvent {
    getName() {
        return 'LoadDb';
    }
    async onRegisterEntities() {
        return [];
    }
}
//# sourceMappingURL=LoadDb.js.map