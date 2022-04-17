
export class Footer {

    private _element: any;

    public constructor(element?: any) {
        if (element) {
            this._element = element;
        } else {
            this._element = jQuery('.main-footer');
        }

        if (this._element.length === 0) {
            throw Error('footer element not found!');
        }

        jQuery(
            '<strong id="ccc_copyright"></strong>\n' +
            '    All rights reserved.\n' +
            '    <div class="float-right d-none d-sm-inline-block" id="ccc_version">\n' +
            '    </div>'
        ).appendTo(this._element);

    }

}