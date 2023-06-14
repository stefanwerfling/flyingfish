import {
    ButtonClass, ButtonDefault, ButtonDefaultType, Card, CardBodyType, CardType, FormGroup,
    InputBottemBorderOnly2, InputType, Switch
} from 'bambooo';
import {UpStream} from 'flyingfish_schemas';

/**
 * UpstreamCard
 */
export class UpstreamCard {

    /**
     * info card
     * @protected
     */
    protected _card: Card;

    /**
     * upstream
     * @protected
     */
    protected _upstream: UpStream;

    /**
     * input address
     * @protected
     */
    protected _inputAddress: InputBottemBorderOnly2;

    /**
     * input port
     * @protected
     */
    protected _inputPort: InputBottemBorderOnly2;

    /**
     * switch proxy protocol out
     * @protected
     */
    protected _switchProxyProtocolOut: Switch;

    /**
     * constructor
     * @param card
     * @param upstream
     */
    public constructor(card: Card, upstream: UpStream) {
        this._upstream = upstream;

        this._card = new Card(card.getElement(), CardBodyType.none, CardType.warning);
        this._card.setTitle(`#${upstream.id}`);

        const groupAddress = new FormGroup(this._card, 'Address');
        this._inputAddress = new InputBottemBorderOnly2(groupAddress);

        const groupPort = new FormGroup(this._card, 'Port');
        this._inputPort = new InputBottemBorderOnly2(groupPort, undefined, InputType.number);

        const groupProxyProtocolOut = new FormGroup(this._card, 'Proxy protocol out');
        this._switchProxyProtocolOut = new Switch(groupProxyProtocolOut, 'proxy_protocol_out');

        const removeUpstreamBtn = new ButtonDefault(
            this._card.getToolsElement(),
            '',
            'fa-trash',
            ButtonClass.tool,
            ButtonDefaultType.none
        );

        removeUpstreamBtn.setOnClickFn(() => {
            // todo mark as delete
            this.remove();
        });

        this.setAddress(upstream.address);
        this.setPort(`${upstream.port}`);
        this.setProxyProtocolOut(upstream.proxy_protocol_out);
    }

    /**
     * setAddress
     * @param address
     */
    public setAddress(address: string): void {
        this._inputAddress.setValue(address);
    }

    /**
     * getAddress
     */
    public getAddress(): string {
        return this._inputAddress.getValue();
    }

    /**
     * setPort
     * @param port
     */
    public setPort(port: string): void {
        this._inputPort.setValue(port);
    }

    /**
     * getPort
     */
    public getPort(): string {
        return this._inputPort.getValue();
    }

    /**
     * setProxyProtocolOut
     * @param enable
     */
    public setProxyProtocolOut(enable: boolean): void {
        this._switchProxyProtocolOut.setEnable(enable);
    }

    /**
     * getProxyProtocolOut
     */
    public getProxyProtocolOut(): boolean {
        return this._switchProxyProtocolOut.isEnable();
    }

    /**
     * remove
     */
    public remove(): void {
        this._card.getMainElement().remove();
    }

    /**
     * getUpstream
     */
    public getUpstream(): UpStream {
        this._upstream.port = parseInt(this.getPort(), 10);
        this._upstream.address = this.getAddress();
        this._upstream.proxy_protocol_out = this.getProxyProtocolOut();

        return this._upstream;
    }

}