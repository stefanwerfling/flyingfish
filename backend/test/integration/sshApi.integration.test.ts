/**
 * API integration tests for the Ssh controller (supertest + real MariaDB).
 * The controller only exposes a list endpoint; this covers the auth guard and
 * the empty list on a fresh database.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {Ssh} from '../../src/Routes/Main/Ssh.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new Ssh()];

describe('Ssh API (integration)', () => {
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('list requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/ssh/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('list is empty on a fresh database', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/ssh/list');
        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(res.body.list).toEqual([]);
    });
});