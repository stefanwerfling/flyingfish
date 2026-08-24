/**
 * API integration tests for the Ssl controller (supertest + real MariaDB).
 * Covers the auth guard, the provider list and schema validation on the
 * cert-details and wildcard endpoints.
 *
 * The run/service endpoint (drives the ACME certificate run) and the on-disk
 * certificate reading paths are intentionally out of scope here.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {Ssl} from '../../src/Routes/Main/Ssl.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new Ssl()];

describe('Ssl API (integration)', () => {
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('provider list requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/ssl/provider/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('provider list returns the registered providers', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/ssl/provider/list');
        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(Array.isArray(res.body.list)).toBe(true);
    });

    test('cert details rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/ssl/cert/details').send({});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });

    test('cert wildcards rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/ssl/cert/wildcards').send({});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});