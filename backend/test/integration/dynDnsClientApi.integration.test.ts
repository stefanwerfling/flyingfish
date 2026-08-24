/**
 * API integration tests for the DynDnsClient controller (supertest + real
 * MariaDB). Covers the auth guard, the (empty) client list, the provider list
 * and schema validation on save.
 *
 * A full client save round-trip needs a provider entry + domain fixture graph
 * and the run endpoints drive the DynDnsService against a real provider, so
 * both are intentionally out of scope here.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {DynDnsClient} from '../../src/Routes/Main/DynDnsClient.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new DynDnsClient()];

describe('DynDnsClient API (integration)', () => {
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('list requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/dyndnsclient/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('list is empty on a fresh database', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/dyndnsclient/list');
        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(res.body.list).toEqual([]);
    });

    test('provider list returns the registered providers', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/dyndnsclient/provider/list');
        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(Array.isArray(res.body.list)).toBe(true);
    });

    test('save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/dyndnsclient/save').send({provider: 'incomplete'});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});