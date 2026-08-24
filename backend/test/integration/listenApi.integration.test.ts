/**
 * API integration tests for the Listen CRUD controller (supertest + real
 * MariaDB). Covers the authenticated list/save/delete round-trip, the reserved
 * / duplicate port rejections and schema validation.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {ListenData, StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {Listen} from '../../src/Routes/Main/Listen.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new Listen()];

const sampleListen = (port = 8080, name = 'test-listen'): ListenData => {
    return {
        id: 0,
        type: 0,
        port: port,
        protocol: 0,
        enable_ipv6: false,
        check_address: false,
        check_address_type: 0,
        name: name,
        routeless: false,
        description: '',
        disable: false,
        proxy_protocol: false,
        proxy_protocol_in: false,
        stream_server_variables: []
    };
};

describe('Listen API (integration)', () => {
    // Reset once after init so this file is isolated from data any earlier test
    // file seeded; afterEach keeps the tests within this file isolated.
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('list requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/listen/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('save then list returns the stored listen', async() => {
        const agent = await loginAgent(routes);

        const save = await agent.post('/json/listen/save').send(sampleListen());
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/listen/list');
        expect(list.body.statusCode).toBe(StatusCodes.OK);
        expect(list.body.list).toHaveLength(1);
        expect(list.body.list[0]).toMatchObject({name: 'test-listen', port: 8080});
    });

    test('save rejects a reserved system port', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/listen/save').send(sampleListen(53));

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });

    test('save rejects a duplicate port', async() => {
        const agent = await loginAgent(routes);

        await agent.post('/json/listen/save').send(sampleListen(8080, 'first'));
        const res = await agent.post('/json/listen/save').send(sampleListen(8080, 'second'));

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });

    test('delete removes the listen', async() => {
        const agent = await loginAgent(routes);

        await agent.post('/json/listen/save').send(sampleListen());
        const created = await agent.get('/json/listen/list');
        const id = created.body.list[0].id;

        const del = await agent.post('/json/listen/delete').send({id: id});
        expect(del.body.statusCode).toBe(StatusCodes.OK);

        const after = await agent.get('/json/listen/list');
        expect(after.body.list).toHaveLength(0);
    });

    test('save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/listen/save').send({name: 'incomplete'});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});