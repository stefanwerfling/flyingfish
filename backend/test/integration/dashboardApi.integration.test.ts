/**
 * API integration test for the Dashboard controller (supertest + real MariaDB).
 *
 * Only the info aggregation is exercised: it reads blacklist counts + locations
 * from the DB and the cached public IP (getCurrentIp(false) does not trigger an
 * external lookup). The other dashboard endpoints are out of scope here -
 * streamrequests needs InfluxDB and publicipblacklistcheck performs external
 * RBL lookups.
 *
 * The dashboard routes call isUserLogin(req, res, false) (no auto-response) but
 * each handler adds its own else-branch returning statusCode UNAUTHORIZED, so an
 * unauthenticated request is answered rather than left hanging - covered below.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {Dashboard} from '../../src/Routes/Main/Dashboard.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new Dashboard()];

describe('Dashboard API (integration)', () => {
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('info answers with UNAUTHORIZED (not a hang) when not logged in', async() => {
        const res = await request(buildApiApp(routes)).get('/json/dashboard/info');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('info returns an OK aggregation on a fresh database', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/dashboard/info');
        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(res.body.ipblocks).toEqual([]);
        // countBlocks() returns null (not 0) when there are no blocks yet.
        expect(res.body.ipblock_count).toBeFalsy();
    });
});