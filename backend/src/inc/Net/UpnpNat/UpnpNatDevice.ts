import {XMLParser} from 'fast-xml-parser';
import got from 'got';
import {URL} from 'url';
import {DeviceDescription} from './Device/DeviceDescription.js';
import {DeviceService} from './Device/DeviceService.js';
import {RawDevice} from './Device/RawDevice.js';
import {RawService} from './Device/RawService.js';
import {RawResponse} from './Device/RawResponse.js';

/**
 * UpnpNat device object.
 */
export class UpnpNatDevice {

    protected _uuid: string;

    protected _description: string;

    protected _services: string[];

    public constructor(url: string, uuid: string) {
        this._description = url;
        this._uuid = uuid;
        this._services = [
            'urn:schemas-upnp-org:service:WANIPConnection:1',
            'urn:schemas-upnp-org:service:WANIPConnection:2',
            'urn:schemas-upnp-org:service:WANPPPConnection:1'
        ];
    }

    /**
     * Return the device uuid.
     * @returns {string}
     */
    public getUuid(): string {
        return this._uuid;
    }

    /**
     * getXML
     * @param url
     * @private
     */
    private async getXML(url: string): Promise<any> {
        return got.get(url).then(
            (data) => new XMLParser().parse(data.body)
        ).catch(() => new Error('Failed to lookup device description'));
    }

    /**
     * Prase description.
     * @param info
     * @returns {DeviceDescription}
     */
    public parseDescription(info: { device?: RawDevice; }): DeviceDescription {
        const services: RawService[] = [];
        const devices: RawDevice[] = [];

        const traverseDevices = (device?: RawDevice): void => {
            if (!device) {
                return;
            }

            const serviceList = device.serviceList?.service ?? [];
            const deviceList = device.deviceList?.device ?? [];

            devices.push(device);

            if (Array.isArray(serviceList)) {
                services.push(...serviceList);
            } else {
                services.push(serviceList);
            }

            if (Array.isArray(deviceList)) {
                deviceList.forEach(traverseDevices);
            } else {
                traverseDevices(deviceList);
            }
        };

        traverseDevices(info.device);

        return {
            services: services,
            devices: devices
        };
    }

    /**
     * Return service.
     * @param {string[]} types
     * @returns {DeviceService}
     */
    public async getService(types: string[]): Promise<DeviceService> {
        return this.getXML(this._description).then(({root: xml}) => {
            const services = this.parseDescription(xml).services.filter(
                ({serviceType}) => types.includes(serviceType)
            );

            if (
                services.length === 0 ||
                !services[0].controlURL ||
                !services[0].SCPDURL
            ) {
                throw new Error('Service not found');
            }

            const baseUrl = new URL(xml.baseURL, this._description);
            const prefix = (url: string): string => new URL(url, baseUrl.toString()).toString();

            return {
                service: services[0].serviceType,
                SCPDURL: prefix(services[0].SCPDURL),
                controlURL: prefix(services[0].controlURL)
            };
        });
    }

    /**
     * Run the call to a device.
     * @param {string} action
     * @param {(string|number)[][]} args
     */
    public async run(action: string, args: (string | number)[][]): Promise<RawResponse> {
        const info = await this.getService(this._services);

        const body =
            `${'<?xml version="1.0"?>' +
            '<s:Envelope ' +
            'xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ' +
            's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
            '<s:Body>' +
            '<u:'}${
                action
            } xmlns:u=${
                JSON.stringify(info.service)
            }>${
                args.reduce(
                    (p, [a, b]) => `${p}<${a ?? ''}>${b ?? ''}</${a ?? ''}>`,
                    ''
                )
            }</u:${
                action
            }>` +
            '</s:Body>' +
            '</s:Envelope>';

        return got.post(info.controlURL, {
            body: body,
            headers: {
                'Content-Type': 'text/xml; charset="utf-8"',
                'Content-Length': `${Buffer.byteLength(body)}`,
                'Connection': 'close',
                'SOAPAction': JSON.stringify(`${info.service}#${action}`)
            }
        }).then(
            (data) => new XMLParser({removeNSPrefix: true}).parse(data.body).Envelope.Body
        );
    }

}