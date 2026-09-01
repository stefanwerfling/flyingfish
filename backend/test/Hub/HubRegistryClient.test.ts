/**
 * Unit tests for the shared Hub registry client (flyingfish_core), used by every
 * standalone part to self-register. Mocks global fetch; network-free.
 */
import {jest} from '@jest/globals';
import {StatusCodes, buildDnsCapabilityManifest} from 'flyingfish_schemas';
import {byeHub, heartbeatHub, registerWithHub, startHubRegistration} from 'flyingfish_core';

const SECRET_HEADER = 'x-flyingfish-registry-secret';
const URL_BASE = 'http://backend:3000';
const SECRET = 's3cret';

/**
 * Build a mocked fetch Response with the given body statusCode.
 */
const mockResponse = (statusCode: string, ok: boolean = true): Response => {
    return {
        ok: ok,
        status: ok ? 200 : 500,
        json: async(): Promise<unknown> => ({statusCode: statusCode})
    } as Response;
};

describe('HubRegistryClient', () => {
    let fetchMock: ReturnType<typeof jest.fn>;

    beforeEach(() => {
        fetchMock = jest.fn();
        (global as unknown as {fetch: ReturnType<typeof jest.fn>;}).fetch = fetchMock;
    });

    test('registerWithHub POSTs the manifest with the secret header and reports success', async() => {
        fetchMock.mockResolvedValue(mockResponse(StatusCodes.OK));

        const manifest = buildDnsCapabilityManifest('dns-1');
        const ok = await registerWithHub(URL_BASE, SECRET, manifest);

        expect(ok).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('http://backend:3000/json/registry/register');
        expect(init.method).toBe('POST');
        expect(init.headers[SECRET_HEADER]).toBe(SECRET);
        expect(JSON.parse(init.body).part.instanceId).toBe('dns-1');
    });

    test('registerWithHub reports failure on a non-OK body status', async() => {
        fetchMock.mockResolvedValue(mockResponse(StatusCodes.INTERNAL_ERROR));

        const ok = await registerWithHub(URL_BASE, SECRET, buildDnsCapabilityManifest('dns-1'));

        expect(ok).toBe(false);
    });

    test('registerWithHub is non-fatal when fetch throws', async() => {
        fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(registerWithHub(URL_BASE, SECRET, buildDnsCapabilityManifest('dns-1'))).resolves.toBe(false);
    });

    test('heartbeatHub POSTs the instance id and reports known/unknown', async() => {
        fetchMock.mockResolvedValue(mockResponse(StatusCodes.OK));
        await expect(heartbeatHub(URL_BASE, SECRET, 'dns-1')).resolves.toBe(true);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('http://backend:3000/json/registry/heartbeat');
        expect(JSON.parse(init.body)).toEqual({instanceId: 'dns-1'});

        fetchMock.mockResolvedValue(mockResponse(StatusCodes.INTERNAL_ERROR));
        await expect(heartbeatHub(URL_BASE, SECRET, 'nope')).resolves.toBe(false);
    });

    test('byeHub POSTs the instance id to the bye endpoint', async() => {
        fetchMock.mockResolvedValue(mockResponse(StatusCodes.OK));

        await byeHub(URL_BASE, SECRET, 'dns-1');

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('http://backend:3000/json/registry/bye');
        expect(JSON.parse(init.body)).toEqual({instanceId: 'dns-1'});
    });

    test('startHubRegistration registers immediately and bye on stop()', async() => {
        fetchMock.mockResolvedValue(mockResponse(StatusCodes.OK));

        // Large interval so the heartbeat timer never fires during the test.
        const handle = await startHubRegistration(
            URL_BASE,
            SECRET,
            buildDnsCapabilityManifest('dns-1'),
            {heartbeatMs: 3600000}
        );

        expect(fetchMock.mock.calls[0][0]).toBe('http://backend:3000/json/registry/register');

        await handle.stop();

        const lastUrl = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0];
        expect(lastUrl).toBe('http://backend:3000/json/registry/bye');
    });
});