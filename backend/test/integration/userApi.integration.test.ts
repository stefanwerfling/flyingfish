/**
 * API integration tests for the User CRUD controller (supertest + real
 * MariaDB). Covers the authenticated list/save/delete round-trip and the
 * business guards: unique username/email, password rules and the
 * "last enabled user cannot be removed/disabled" protection.
 *
 * The login harness seeds the admin user (ffadmin), so a fresh, reset database
 * already contains exactly one user at the start of each test.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {StatusCodes, UserEntry} from 'flyingfish_schemas';
import request from 'supertest';
import {User} from '../../src/Routes/Main/User.js';
import {TEST_EMAIL, buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new User()];

const sampleUser = (username = 'bob', email = 'bob@example.org'): UserEntry => {
    return {
        id: 0,
        username: username,
        password: 'pw123456',
        password_repeat: 'pw123456',
        email: email,
        disable: false
    };
};

const findId = (list: {id: number; username: string;}[], username: string): number => {
    const found = list.find((entry) => entry.username === username);

    return found ? found.id : 0;
};

describe('User API (integration)', () => {
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('list requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/user/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('list returns the seeded admin user', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/user/list');
        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(res.body.list).toHaveLength(1);
        expect(res.body.list[0].username).toBe('ffadmin');
    });

    test('save adds a new user', async() => {
        const agent = await loginAgent(routes);

        const save = await agent.post('/json/user/save').send(sampleUser());
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/user/list');
        expect(list.body.list).toHaveLength(2);
        expect(list.body.list.map((u: {username: string;}) => u.username)).toContain('bob');
    });

    test('save rejects a duplicate username', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/user/save').send(sampleUser('ffadmin', 'other@example.org'));

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
        expect(res.body.msg).toBe('Username already in use!');
    });

    test('save rejects a duplicate email', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/user/save').send(sampleUser('someone', TEST_EMAIL));

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
        expect(res.body.msg).toBe('EMail already in use!');
    });

    test('save rejects a new user without a password', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/user/save').send({
            id: 0,
            username: 'nopass',
            email: 'nopass@example.org',
            disable: false
        });

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
        expect(res.body.msg).toBe('Please set password and password repeat for a new user!');
    });

    test('delete removes a user (when another enabled user remains)', async() => {
        const agent = await loginAgent(routes);

        await agent.post('/json/user/save').send(sampleUser());
        const created = await agent.get('/json/user/list');
        const bobId = findId(created.body.list, 'bob');

        const del = await agent.post('/json/user/delete').send({id: bobId});
        expect(del.body.statusCode).toBe(StatusCodes.OK);

        const after = await agent.get('/json/user/list');
        expect(after.body.list).toHaveLength(1);
    });

    test('delete refuses to remove the last enabled user', async() => {
        const agent = await loginAgent(routes);

        const list = await agent.get('/json/user/list');
        const adminId = findId(list.body.list, 'ffadmin');

        const res = await agent.post('/json/user/delete').send({id: adminId});
        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
        expect(res.body.msg).toBe('The last one has to work!');
    });

    test('save rejects a schema-invalid payload', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/user/save').send({username: 'incomplete'});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });
});