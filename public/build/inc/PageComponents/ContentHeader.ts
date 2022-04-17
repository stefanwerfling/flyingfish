
export class ContentHeader {

    private _element: any;
    private _title: string = '';

    public constructor(element?: any) {
        if (element) {
            this._element = element;
        } else {
            this._element = jQuery('.content-header');
        }

        this._element.append(
            '      <div class="container-fluid">\n' +
            '        <div class="row mb-2">\n' +
            '          <div class="col-sm-6" id="ccc_ch_title">\n' +
            '          </div><!-- /.col -->\n' +
            '          <div class="col-sm-6">\n' +
            // todo
            '          </div><!-- /.col -->\n' +
            '        </div><!-- /.row -->\n' +
            '      </div><!-- /.container-fluid -->'
        );
    }

    public getElement(): any {
        return this._element;
    }

    public setTitle(title: string): void {
        this._title = title;
        this._element.find('#ccc_ch_title').append(`<h1 class="m-0">${title}</h1>`);
    }

    public getTitle(): string {
        return this._title;
    }

}