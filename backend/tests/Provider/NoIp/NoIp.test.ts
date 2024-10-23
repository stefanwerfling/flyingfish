import {DynDnsProviders} from '../../../src/inc/Provider/DynDnsProviders';
import {IDynDns} from '../../../src/inc/Provider/IDynDns';
import {SchemaMatchers} from '../../../src/types/ExpectSchema';

expect.extend(SchemaMatchers);

describe('testing dyndns client noip', () => {
    let username: string|null = null;
    let password: string|null = null;
    let hostname: string|null = null;
    let provider: IDynDns|null = null;

    beforeAll(async() => {
        if (process.env.TESTS_BACKEND_DYNCLIENT_NOIP_USERNAME) {
            username = process.env.TESTS_BACKEND_DYNCLIENT_NOIP_USERNAME;
        }

        if (process.env.TESTS_BACKEND_DYNCLIENT_NOIP_PASSWORD) {
            password = process.env.TESTS_BACKEND_DYNCLIENT_NOIP_PASSWORD;
        }

        if (process.env.TESTS_BACKEND_DYNCLIENT_NOIP_HOSTNAME) {
            hostname = process.env.TESTS_BACKEND_DYNCLIENT_NOIP_HOSTNAME;
        }

        provider = DynDnsProviders.getProvider('noip');
    });

    // -----------------------------------------------------------------------------------------------------------------

    test('check setting by env', async() => {
        expect(username).not.toBeNull();
        expect(password).not.toBeNull();
        expect(hostname).not.toBeNull();
    });

    // -----------------------------------------------------------------------------------------------------------------

    test('update with wrong access', async() => {
        expect(provider).not.toBeNull();

        if (provider) {
            const result = await provider.update(
                'wrongname',
                'password',
                '3.4.5.6'
            );

            expect(result.result).toBe(false);
        }
    });

    test('update', async() => {
        expect(provider).not.toBeNull();

        /*const result = provider.update(

        );*/
    });
});