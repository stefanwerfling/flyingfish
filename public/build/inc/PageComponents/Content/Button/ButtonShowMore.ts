import {Element} from '../../Element';

/**
 * ButtonShowMore
 */
export class ButtonShowMore extends Element {

    /**
     * constructor
     * @param element
     * @param showContent
     * @param hideContent
     */
    public constructor(element: any, showContent: any, hideContent: any) {
        super();

        this._element = jQuery('<table/>').appendTo(element);
        this._element.css({});

        const trln1 = jQuery('<tr/>').appendTo(this._element);
        const tdbtn = jQuery('<td/>').appendTo(trln1);
        tdbtn.css({'border-top': '0px'});

        const btn = jQuery('<button type="button" class="btn btn-default p-0" />').appendTo(tdbtn);
        const iBtn = jQuery('<i class="expandable-table-caret fas fa-caret-right fa-fw" />').appendTo(btn);

        const tdShow = jQuery('<td/>').appendTo(trln1);
        tdShow.css({'border-top': '0px'});
        tdShow.append(showContent);

        const trln2 = jQuery('<tr/>').appendTo(this._element);
        trln2.hide();
        jQuery('<td/>').appendTo(trln2).css({'border-top': '0px'});

        const tdhide = jQuery('<td/>').appendTo(trln2);
        tdhide.css({'border-top': '0px'});
        tdhide.append(hideContent);

        let isShow = false;

        btn.on({click: () => {
            if (isShow) {
                trln2.hide();
                isShow = false;

                iBtn.css({
                    '-webkit-transform': '',
                    'transform': 'rotate(0deg)'
                });
            } else {
                trln2.show();
                isShow = true;

                iBtn.css({
                    '-webkit-transform': 'rotate(90deg);',
                    'transform': 'rotate(90deg)'
                });
            }
        }});
    }

}