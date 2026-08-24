/**
 * API integration tests for the UpnpNat controller (supertest + real MariaDB).
 * Covers the authenticated list/save/delete round-trip and schema validation
 * for the stored NAT port entries.
 *
 * The gateway-info and open-port endpoints are intentionally not exercised -
 * they talk to a real UPnP gateway on the network.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {StatusCodes, UpnpNatPort} from 'flyingfish_schemas';
import request from 'supertest';
import {UpnpNat} from '../../src/Routes/Main/UpnpNat.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new UpnpNat()];

const sampleNat = (publicPort = 8443): UpnpNatPort => {
    return {
        id: 0,
        postion: 0,
        public_port: publicPort,
        gateway_identifier_id: 0,
        gateway_address: '192.168.0.1',
        private_port: 443,
        client_address: '192.168.0.10',
        use_himhip_host_address: false,
        ttl: 3600,
        protocol: 'TCP',
        last_ttl_update: 0,
        listen_id: 0,
        description: 'test',
        last_status: 0,
        last_update: 0
    };
};

describe('UpnpNat API (integration)', () => {
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('list requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/upnpnat/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('list is empty on a fresh database', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/upnpnat/list');
        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(res.body.data).toEqual([]);
    });

    test('save then list then delete round-trip', async() => {
        const agent = await loginAgent(routes);

        const save = await agent.post('/json/upnpnat/save').send(sampleNat());
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/upnpnat/list');
        expect(list.body.statusCode).toBe(StatusCodes.OK);
        expect(list.body.data).toHaveLength(1);
        expect(list.body.data[0].public_port).toBe(8443);

        const del = await agent.post('/json/upnpnat/delete').send({id: list.body.data[0].id});
        expect(del.body.statusCode).toBe(StatusCodes.OK);

        const after = await agent.get('/json/upnpnat/list');
        expect(after.body.data).toHaveLength(0);
    });

    test('save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/upnpnat/save').send({public_port: 8443});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});