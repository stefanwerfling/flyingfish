/**
 * API integration tests for the GatewayIdentifier CRUD controller
 * (supertest + real MariaDB): an authenticated list/save/delete round-trip
 * driven through a real logged-in session.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {GatewayIdentifierEntry, StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {GatewayIdentifier} from '../../src/Routes/Main/GatewayIdentifier.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new GatewayIdentifier()];

const sampleEntry = (): GatewayIdentifierEntry => {
    return {
        id: 0,
        networkname: 'home',
        mac_address: 'aa:bb:cc:dd:ee:ff',
        address: '192.168.0.1',
        color: '#ff0000'
    };
};

describe('GatewayIdentifier API (integration)', () => {
    // Reset once after init so this file is isolated from data any earlier test
    // file seeded; afterEach keeps the tests within this file isolated.
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('list requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/gatewayidentifier/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('save then list returns the stored gateway identifier', async() => {
        const agent = await loginAgent(routes);

        const save = await agent.post('/json/gatewayidentifier/save').send(sampleEntry());
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/gatewayidentifier/list');
        expect(list.body.statusCode).toBe(StatusCodes.OK);
        expect(list.body.data).toHaveLength(1);
        expect(list.body.data[0]).toMatchObject({
            networkname: 'home',
            mac_address: 'aa:bb:cc:dd:ee:ff',
            address: '192.168.0.1',
            color: '#ff0000'
        });
    });

    test('save updates an existing entry instead of creating a new one', async() => {
        const agent = await loginAgent(routes);

        await agent.post('/json/gatewayidentifier/save').send(sampleEntry());
        const created = await agent.get('/json/gatewayidentifier/list');
        const id = created.body.data[0].id;

        const update = await agent.post('/json/gatewayidentifier/save').send({
            ...sampleEntry(),
            id: id,
            networkname: 'office'
        });
        expect(update.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/gatewayidentifier/list');
        expect(list.body.data).toHaveLength(1);
        expect(list.body.data[0].networkname).toBe('office');
    });

    test('delete removes the gateway identifier', async() => {
        const agent = await loginAgent(routes);

        await agent.post('/json/gatewayidentifier/save').send(sampleEntry());
        const created = await agent.get('/json/gatewayidentifier/list');
        const id = created.body.data[0].id;

        const del = await agent.post('/json/gatewayidentifier/delete').send({id: id});
        expect(del.body.statusCode).toBe(StatusCodes.OK);

        const after = await agent.get('/json/gatewayidentifier/list');
        expect(after.body.data).toHaveLength(0);
    });

    test('save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/gatewayidentifier/save').send({networkname: 'incomplete'});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});