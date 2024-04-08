import {
    ModalDialog,
    ModalDialogType,
    Element,
    Table,
    Tr,
    Th,
    Td,
    Circle,
    CircleColor,
    ButtonMenu,
    ButtonType, ButtonMenuPosition, IconFa
} from 'bambooo';
import {Dashboard as DashboardAPI} from '../../Api/Dashboard';

/**
 * DashboardIpBlacklistModal
 */
export class DashboardIpBlacklistModal extends ModalDialog {

    /**
     * toast
     * @protected
     */
    protected _toast: any;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'dashboardipblacklistmodal', ModalDialogType.large);

        this.setTitle('Public IP blacklist check');

        // @ts-ignore
        // eslint-disable-next-line no-undef
        this._toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });

        this.addButtonClose();
    }

    /**
     * show
     */
    public override show(): void {
        super.show();

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body.empty());

        const loadData = async(): Promise<void> => {
            this.showLoading();
            const rblResponse = await DashboardAPI.publicIpBlacklistCheck();

            this.hideLoading();

            const table = new Table(bodyCard);
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, 'RBL', '100%');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Status', '150px');

            for (const entry of rblResponse.rbl) {
                const trbody = new Tr(table.getTbody());

                // eslint-disable-next-line no-new
                const rblTd = new Td(trbody, '');

                const btnRbl = new ButtonMenu(
                    rblTd,
                    null,
                    true,
                    ButtonType.borderless,
                    ButtonMenuPosition.none
                );

                btnRbl.getElement().append(entry.rbl);

                btnRbl.addMenuItem('Copy to clipboard', () => {
                    navigator.clipboard.writeText(entry.rbl);

                    this._toast.fire({
                        icon: 'success',
                        title: 'RBL Domain copy to clipboard'
                    });

                }, IconFa.copy);

                const statusTd = new Td(trbody, '');

                // eslint-disable-next-line no-new
                new Circle(statusTd, entry.listed ? CircleColor.red : CircleColor.green);
            }
        };

        loadData();
    }

}