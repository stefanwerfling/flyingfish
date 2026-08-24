/**
 * API integration tests for the Route controller (supertest + real MariaDB).
 *
 * Covers the auth guard, the (empty) list read and schema validation on the
 * http/stream save endpoints. Full route round-trips are intentionally not
 * exercised here: a valid route save requires a pre-existing domain + listen
 * (and, for streams, ssh) fixture graph; that deeper coverage is deferred to a
 * dedicated fixture-building test.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {Route} from '../../src/Routes/Main/Route.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new Route()];

describe('Route API (integration)', () => {
    // Reset once after init so this file is isolated from data any earlier test
    // file seeded; afterEach keeps the tests within this file isolated.
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('list requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/route/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('list returns an empty route set on a fresh database', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/route/list');

        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(res.body.list).toEqual([]);
    });

    test('http save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/route/http/save').send({});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });

    test('stream save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/route/stream/save').send({});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});