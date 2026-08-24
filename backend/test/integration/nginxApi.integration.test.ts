/**
 * API integration test for the Nginx controller (supertest + real MariaDB).
 *
 * Only the auth guard is exercised: the reload action calls
 * NginxService.getInstance().reload(), which runs the real nginx binary and is
 * not available in the test environment, so the authenticated reload path is
 * out of scope here.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {Nginx} from '../../src/Routes/Main/Nginx.js';
import {buildApiApp} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new Nginx()];

describe('Nginx API (integration)', () => {
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('reload requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/nginx/reload');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });
});