import {DnsGlobalServer} from 'flyingfish_schemas';

/**
 * DnsGlobal
 */
export class DnsGlobal {

    /**
     * dns server list
     * @protected
     */
    protected _dnsServers: DnsGlobalServer[] = [
        {
            provider: 'Google',
            location: 'Mountain View CA, United States',
            country: 'US',
            latitude: '37.4059',
            longitude: '-122.078',
            ip: '8.8.8.8'
        },
        {
            provider: 'Quad9',
            location: 'Berkeley, US',
            country: 'US',
            latitude: '37.8793',
            longitude: '-122.265',
            ip: '9.9.9.9'
        },
        {
            provider: 'OpenDNS',
            location: 'San Francisco CA, United States',
            country: 'US',
            latitude: '38',
            longitude: '-122',
            ip: '208.67.222.220'
        },
        {
            provider: 'AT&T Services',
            location: 'Miami, United States',
            country: 'US',
            latitude: '26',
            longitude: '-80',
            ip: '12.121.117.201'
        },
        {
            provider: 'WholeSale Internet, Inc.',
            location: 'Kansas City, United States',
            country: 'US',
            latitude: '39.1478',
            longitude: '-94.5688',
            ip: '204.12.225.227'
        },
        {
            provider: 'Oracle Corporation',
            location: 'New York, United States',
            country: 'US',
            latitude: '41',
            longitude: '-74',
            ip: '216.146.35.35'
        },
        {
            provider: 'VeriSign Global Registry Services',
            location: 'Virginia, United States',
            country: 'US',
            latitude: '38',
            longitude: '-98',
            ip: '64.6.64.6'
        },
        {
            provider: 'Cogeco Peer 1',
            location: 'Québec, Canada',
            country: 'CA',
            latitude: '47',
            longitude: '-71',
            ip: '65.39.166.132'
        },
        {
            provider: 'IONICA LLC',
            location: 'Ramenskoye, Russia',
            country: 'RU',
            latitude: '55.5669',
            longitude: '38.2302',
            ip: '176.103.130.130'
        },
        {
            provider: 'Telkom SA Ltd',
            location: 'Greytown, South Africa',
            country: 'ZA',
            latitude: '-29',
            longitude: '31',
            ip: '196.15.170.131'
        },
        {
            provider: 'Tele2 Nederland B.V.',
            location: 'Diemen, Netherlands',
            country: 'NL',
            latitude: '52.3396',
            longitude: '4.9625',
            ip: '87.213.100.113'
        },
        {
            provider: 'Association Gitoyen',
            location: 'Paris, France',
            country: 'FR',
            latitude: '48.8534',
            longitude: '2.3488',
            ip: '80.67.169.40'
        },
        {
            provider: 'Prioritytelecom Spain S.A.',
            location: 'Madrid, Spain',
            country: 'ES',
            latitude: '40.4165',
            longitude: '-3.7025',
            ip: '212.230.255.1'
        },
        {
            provider: 'Swisscom AG',
            location: 'Zurich, Switzerland',
            country: 'CH',
            latitude: '47.3666',
            longitude: '8.55',
            ip: '62.202.10.85'
        },
        {
            provider: 'nemox.net',
            location: 'Innsbruck, Austria',
            country: 'AT',
            latitude: '47.2626',
            longitude: '11.3945',
            ip: '83.137.41.9'
        },
        {
            provider: 'South West Communications Group Ltd',
            location: 'Exeter, United Kingdom',
            country: 'GB',
            latitude: '50.7235',
            longitude: '-3.5275',
            ip: '81.17.66.13'
        },
        {
            provider: 'Nianet A/S',
            location: 'Glostrup, Denmark',
            country: 'DK',
            latitude: '55.6666',
            longitude: '12.4',
            ip: '93.176.83.154'
        },
        {
            provider: 'Probe Networks',
            location: 'Saarland, Germany',
            country: 'DE',
            latitude: '49.4433',
            longitude: '6.6387',
            ip: '82.96.64.2'
        },
        {
            provider: 'Megacable',
            location: 'Culiacan, Mexico',
            country: 'MX',
            latitude: '24.7994',
            longitude: '-107.39',
            ip: '200.52.177.186'
        },
        {
            provider: 'Claro S.A',
            location: 'Santa Cruz do Sul, Brazil',
            country: 'BR',
            latitude: '-29.7175',
            longitude: '-52.4258',
            ip: '200.248.178.54'
        },
        {
            provider: 'Ohana Communications Sdn Bhd',
            location: 'Kuala Lumpur, Malaysia',
            country: 'MY',
            latitude: '3.1412',
            longitude: '101.687',
            ip: '103.26.250.4'
        },
        {
            provider: 'Cloudflare Inc',
            location: 'Research, Australia',
            country: 'AU',
            latitude: '-38',
            longitude: '145',
            ip: '1.1.1.1'
        },
        {
            provider: 'Pacific Internet',
            location: 'Melbourne, Australia',
            country: 'AU',
            latitude: '-33.8678',
            longitude: '151.207',
            ip: '61.8.0.113'
        },
        {
            provider: 'SiteHost',
            location: 'Auckland, New Zealand',
            country: 'NZ',
            latitude: '-36.8666',
            longitude: '174.767',
            ip: '223.165.64.97'
        },
        {
            provider: 'Tefincom S.A.',
            location: 'Singapore',
            country: 'SG',
            latitude: '1.2896',
            longitude: '103.85',
            ip: '103.86.99.100'
        },
        {
            provider: 'LG Dacom Corporation',
            location: 'Seoul, South Korea',
            country: 'KR',
            latitude: '37.5682',
            longitude: '126.978',
            ip: '164.124.101.2'
        },
        {
            provider: 'Shenzhen Sunrise Technology Co. Ltd.',
            location: 'Shenzhen, China',
            country: 'CN',
            latitude: '22.5455',
            longitude: '114.068',
            ip: '202.46.34.75'
        },
        {
            provider: 'Turk Telekom',
            location: 'Izmir, Turkey',
            country: 'TR',
            latitude: '38',
            longitude: '27',
            ip: '212.175.192.114'
        },
        {
            provider: 'Mahanagar Telephone Nigam Limited',
            location: 'Mumbai, India',
            country: 'IN',
            latitude: '19',
            longitude: '73',
            ip: '203.94.227.70'
        },
        {
            provider: 'Multinet Pakistan Pvt. Ltd',
            location: 'Islamabad, Pakistan',
            country: 'PK',
            latitude: '34',
            longitude: '73',
            ip: '125.209.116.22'
        },
        {
            provider: 'Daniel Cid',
            location: 'Ireland',
            country: 'IE',
            latitude: '53',
            longitude: '-6',
            ip: '185.228.168.9'
        },
        {
            provider: 'Kloud Technologies Limited',
            location: 'Dhaka, Bangladesh',
            country: 'BD',
            latitude: '23.7104',
            longitude: '90.4074',
            ip: '103.146.221.20'
        }
    ];

    public async check(dnsName: string): Promise<void> {

    }

}