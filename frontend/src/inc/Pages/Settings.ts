import {SettingsList} from 'flyingfish_schemas';
import {Nginx as NginxAPI} from '../Api/Nginx';
import {Settings as SettingsAPI} from '../Api/Settings';
import {Card, ContentCol, ContentColSize, ContentRow, FormGroup, InputBottemBorderOnly2, InputType, SelectBottemBorderOnly2} from 'bambooo';
import {BasePage} from './BasePage';

/**
 * Settings
 */
export class Settings extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'settings';

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Settings');
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            content.empty();

            const settingList = await SettingsAPI.getSettings();

            if (settingList) {
                // nginx -----------------------------------------------------------------------------------------------
                const rowNginx = new ContentRow(content);
                const cardNginx = new Card(new ContentCol(rowNginx, ContentColSize.col12));
                cardNginx.setTitle('Nginx Server Global Settings');

                const bodyCardNginx = jQuery('<div class="card-body"/>').appendTo(cardNginx.getElement());

                const groupNginxWorkerConnections = new FormGroup(bodyCardNginx, 'Worker Connections');
                const inputNginxWorkerConnections = new InputBottemBorderOnly2(
                    groupNginxWorkerConnections, 'nginxworkerconnections', InputType.number
                );

                inputNginxWorkerConnections.setPlaceholder('4096');
                inputNginxWorkerConnections.setValue(settingList.nginx.worker_connections);

                const groupNginxResolver = new FormGroup(bodyCardNginx, 'Resolver');
                const inputNginxResolver = new InputBottemBorderOnly2(
                    groupNginxResolver, 'nginxresolver'
                );

                inputNginxResolver.setPlaceholder('127.0.0.1 or 8.8.8.8');
                inputNginxResolver.setValue(settingList.nginx.resolver);

                // blacklist -------------------------------------------------------------------------------------------

                const rowBl = new ContentRow(content);
                const cardBl = new Card(new ContentCol(rowBl, ContentColSize.col12));
                cardBl.setTitle('Blacklist');

                const bodyCardBl = jQuery('<div class="card-body"/>').appendTo(cardBl.getElement());

                const groupBlImporter = new FormGroup(bodyCardBl, 'Importer Scheduler');
                const selectBlImporter = new SelectBottemBorderOnly2(groupBlImporter);
                selectBlImporter.setValues([
                    {
                        key: '',
                        value: 'Disable'
                    },
                    {
                        key: 'firehol',
                        value: 'Firehol'
                    }
                ]);
                selectBlImporter.setSelectedValue(settingList.blacklist.importer);

                const groupBlIplocate = new FormGroup(bodyCardBl, 'Ip Locate');
                const selectBlIpLocate = new SelectBottemBorderOnly2(groupBlIplocate);
                selectBlIpLocate.setValues([
                    {
                        key: '',
                        value: 'Disable'
                    },
                    {
                        key: 'iplocate.io',
                        value: 'IPLocate.io'
                    }
                ]);
                selectBlIpLocate.setSelectedValue(settingList.blacklist.iplocate);

                // btn -------------------------------------------------------------------------------------------------

                const rowBtn = new ContentRow(content);
                const btnContent = new ContentCol(rowBtn, ContentColSize.col12);

                const btnSave = jQuery('<button type="button" class="btn btn-primary">Save changes</button>').appendTo(btnContent.getElement());

                btnSave.on('click', async(): Promise<void> => {
                    const nsettings: SettingsList = {
                        nginx: {
                            worker_connections: inputNginxWorkerConnections.getValue(),
                            resolver: inputNginxResolver.getValue()
                        },
                        blacklist: {
                            iplocate: selectBlIpLocate.getSelectedValue(),
                            importer: selectBlImporter.getSelectedValue()
                        }
                    };

                    if (await SettingsAPI.saveSettings(nsettings)) {
                        this._toast.fire({
                            icon: 'success',
                            title: 'Domain save success.'
                        });

                        if (await NginxAPI.reload()) {
                            this._toast.fire({
                                icon: 'success',
                                title: 'Nginx server reload config success.'
                            });
                        } else {
                            this._toast.fire({
                                icon: 'error',
                                title: 'Nginx server reload config faild, please check your last settings!'
                            });
                        }

                        if (this._onLoadTable) {
                            this._onLoadTable();
                        }
                    } else {
                        this._toast.fire({
                            icon: 'error',
                            title: 'Can not save the current settings!'
                        });
                    }
                });
            }

        };

        // load table
        await this._onLoadTable();
    }

}