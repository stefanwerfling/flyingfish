import {IpLocateData, IpLocateIo, SchemaIpLocateData} from '../../../src/inc/Provider/IpLocate/IpLocateIo';
import {SchemaMatchers} from '../../../src/types/ExpectSchema';

expect.extend(SchemaMatchers);

describe('testing ip locate IO by ip 8.8.8.8', () => {
    const ip = '8.8.8.8';
    let result: IpLocateData|null = null;

    beforeAll(async() => {
        result = await IpLocateIo.location(ip);
    });

    test('test result is not empty', async() => {
        expect(result).toBeTruthy();
    });

    test('test result type by schema: SchemaIpLocateData', async() => {
        expect(result).toValidateSchema(SchemaIpLocateData);
    });
});