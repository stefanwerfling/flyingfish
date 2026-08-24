/**
 * API integration tests for the Credential controller (supertest + real
 * MariaDB). Covers the provider list, credential save/list, the credential-user
 * sub-resource (save/list, password-repeat check), auth and schema validation.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {Credential as CredentialData, CredentialSchemaTypes, CredentialUser, StatusCodes} from 'flyingfish_schemas';
import request from 'supertest';
import {Credential} from '../../src/Routes/Main/Credential.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new Credential()];

const sampleCredential = (name = 'basic-auth'): CredentialData => {
    return {
        id: 0,
        name: name,
        authSchemaType: CredentialSchemaTypes.Basic,
        provider: 'htpasswd',
        settings: ''
    };
};

const sampleUser = (credentialId: number, password = 'pw', repeat = 'pw'): CredentialUser => {
    return {
        id: 0,
        credential_id: credentialId,
        username: 'alice',
        password: password,
        password_repeat: repeat,
        disabled: false
    };
};

const createCredential = async(agent: ReturnType<typeof request.agent>): Promise<number> => {
    await agent.post('/json/credential/save').send(sampleCredential());
    const list = await agent.get('/json/credential/list');

    return list.body.list[0].id;
};

describe('Credential API (integration)', () => {
    // Reset once after init so this file is isolated from data any earlier test
    // file seeded; afterEach keeps the tests within this file isolated.
    beforeAll(async() => {
        await initTestDb();
        await resetTestDb();
    });
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('credential list requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/credential/list');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('provider list returns the registered providers', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/credential/provider/list');

        expect(res.body.statusCode).toBe(StatusCodes.OK);
        expect(Array.isArray(res.body.list)).toBe(true);
    });

    test('save then list returns the stored credential', async() => {
        const agent = await loginAgent(routes);

        const save = await agent.post('/json/credential/save').send(sampleCredential());
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/credential/list');
        expect(list.body.statusCode).toBe(StatusCodes.OK);
        expect(list.body.list).toHaveLength(1);
        expect(list.body.list[0]).toMatchObject({
            name: 'basic-auth',
            provider: 'htpasswd',
            authSchemaType: CredentialSchemaTypes.Basic
        });
    });

    test('save rejects a schema-invalid credential', async() => {
        const agent = await loginAgent(routes);

        const res = await agent.post('/json/credential/save').send({name: 'incomplete'});

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
    });

    test('a user can be added to a credential and listed back', async() => {
        const agent = await loginAgent(routes);
        const credentialId = await createCredential(agent);

        const save = await agent.post('/json/credential/user/save').send(sampleUser(credentialId));
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const users = await agent.post('/json/credential/user/list').send({credential_id: credentialId});
        expect(users.body.statusCode).toBe(StatusCodes.OK);
        expect(users.body.list).toHaveLength(1);
        expect(users.body.list[0].username).toBe('alice');
        // The password is never echoed back.
        expect(users.body.list[0].password).toBe('');
    });

    test('user save rejects a mismatched password repeat', async() => {
        const agent = await loginAgent(routes);
        const credentialId = await createCredential(agent);

        const res = await agent.post('/json/credential/user/save').send(sampleUser(credentialId, 'pw', 'different'));

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
        expect(res.body.msg).toBe('Password is different!');
    });
});