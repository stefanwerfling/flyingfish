import {Sidebar} from './Sidebar';

export class SidebarUserPanel {

    private _divElement: any;

    private _image: string = '';

    private _username: string = '';

    public constructor(sidebar: Sidebar) {
        this._divElement = jQuery('<div class="user-panel mt-3 pb-3 mb-3 d-flex" />').prependTo(sidebar.getElement());
    }

    public setImage(url: string): void {
        this._image = url;
        this.render();
    }

    public setUsername(username: string): void {
        this._username = username;
        this.render();
    }

    public render(): void {
        this._divElement.empty();

        if (this._image !== '') {
            this._divElement.append(`<div class="image"><img src="${this._image}" class="img-circle elevation-2" alt="User Image"></div>`);
        }

        this._divElement.append(`<div class="info"><a href="#" class="d-block">${this._username}</a></div>`);
    }

}