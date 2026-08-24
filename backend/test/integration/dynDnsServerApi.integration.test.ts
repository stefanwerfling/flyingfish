/**
 * API integration tests for the DynDnsServer controller (supertest + real
 * MariaDB). Covers the authenticated user list/save/delete round-trip, the
 * (public) not-yet-used domain list and schema validation.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {DynDnsServerData, StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {DynDnsServer} from '../../src/Routes/Main/DynDnsServer.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new DynDnsServer()];

const sampleServerUser = (username = 'dyn1'): DynDnsServerData => {
    return {
        user: {
            id: 0,
            username: username,
            password: 'pw123456',
            last_update: 0
        },
        domains: []
    };
};

describe('DynDnsServer API (integration)', () => {
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('list requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/dyndnsserver/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('save then list then delete round-trip', async() => {
        const agent = await loginAgent(routes);

        const save = await agent.post('/json/dyndnsserver/save').send(sampleServerUser());
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/dyndnsserver/list');
        expect(list.body.statusCode).toBe(StatusCodes.OK);
        expect(list.body.list).toHaveLength(1);
        expect(list.body.list[0].user.username).toBe('dyn1');

        const del = await agent.post('/json/dyndnsserver/delete').send({
            user: {...sampleServerUser().user, id: list.body.list[0].user.id},
            domains: []
        });
        expect(del.body.statusCode).toBe(StatusCodes.OK);

        const after = await agent.get('/json/dyndnsserver/list');
        expect(after.body.list).toHaveLength(0);
    });

    test('domain list is reachable and empty on a fresh database', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/dyndnsserver/domain/list');
        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(res.body.list).toEqual([]);
    });

    test('save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/dyndnsserver/save').send({username: 'incomplete'});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});