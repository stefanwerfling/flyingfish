
export class SidebarLogo {

    private _element: any;

    /**
     * image url
     * @private
     */
    private _image: string = '';

    /**
     * title
     * @private
     */
    private _title: string = '';

    public constructor(element?: any) {
        if (element) {
            this._element = element;
        } else {
            throw Error('sidebar logo element not found!');
        }
    }

    public getElement(): any {
        return this._element;
    }

    public setImage(url: string): void {
        this._image = url;
        this.render();
    }

    public setTitle(title: string): void {
        this._title = title;
        this.render();
    }

    public render(): void {
        this._element.empty();
        this._element.append(`<img src="${this._image}" alt="${this._title}" class="brand-image img-circle elevation-3" style="opacity: .8">`)
        this._element.append(`<span class="brand-text font-weight-light">${this._title}</span>`);
    }

}