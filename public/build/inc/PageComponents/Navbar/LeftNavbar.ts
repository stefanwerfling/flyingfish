
export class LeftNavbar {

    private _entries = [
        {
            title: 'Home',
            link: '/index.html'
        }
    ];

    private _element: any;

    public constructor(element?: any) {
        if (element) {
            this._element = jQuery('<ul class="navbar-nav" />').appendTo(element);
        } else {
            throw Error('left navbar element not found!');
        }
    }

    public getElement(): any {
        return this._element;
    }

    public load(): void {
        for (const entry of this._entries) {
            jQuery('#ccc_navbar').append(
                `<li class="nav-item d-none d-sm-inline-block">
                  <a href="${entry.link}" class="nav-link">${entry.title}</a>
                </li>`
            );
        }
    }

}