/**
 * API integration test for the PKI CA tree read endpoint (own-PKI epic 9.4,
 * 9.4.6 frontend tree view). Mirrors the registry API integration test: drives
 * GET /json/pki/tree through the HTTP surface via an authenticated agent against
 * a real MariaDB. Guards the data contract the frontend Pki page consumes and,
 * critically, that the private key material never leaves the backend.
 */
import {SchemaPkiCaTreeResponse, StatusCodes} from 'flyingfish_schemas';
import {CaCertificateDB} from 'flyingfish_core';
import request from 'supertest';
import {Pki} from '../../src/Routes/Main/Pki.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new Pki()];

/**
 * Seed a minimal CA tree (Root + one service intermediate) with private key
 * material, so the test can assert the endpoint hides it.
 * @returns {Promise<number>} the persisted Root id
 */
const seedTree = async(): Promise<number> => {
    const root = new CaCertificateDB();
    root.parent_ca_id = 0;
    root.ca_type = 'root';
    root.purpose = '';
    root.subject = 'CN=FlyingFish Root CA';
    root.algorithm = 'Ed25519';
    root.certificate = 'ROOT-CERT-PEM';
    root.private_key = 'ROOT-SECRET-KEY';
    root.public_key = 'ROOT-PUB';
    root.created_at = 1000;
    await root.save();

    const intermediate = new CaCertificateDB();
    intermediate.parent_ca_id = root.id;
    intermediate.ca_type = 'intermediate';
    intermediate.purpose = 'service';
    intermediate.subject = 'CN=FlyingFish Service Intermediate CA';
    intermediate.algorithm = 'Ed25519';
    intermediate.certificate = 'INT-CERT-PEM';
    intermediate.private_key = 'INT-SECRET-KEY';
    intermediate.public_key = 'INT-PUB';
    intermediate.created_at = 2000;
    await intermediate.save();

    return root.id;
};

describe('PKI tree API (integration)', () => {
    beforeAll(initTestDb);
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('the tree endpoint requires authentication', async() => {
        const res = await request(buildApiApp(routes)).get('/json/pki/tree');

        expect(res.body.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('returns the CA tree with the parent linkage and hides the private keys', async() => {
        const rootId = await seedTree();
        const agent = await loginAgent(routes);

        const res = await agent.get('/json/pki/tree');

        expect(SchemaPkiCaTreeResponse.validate(res.body, [])).toBe(true);
        expect(res.body.list).toHaveLength(2);

        const root = res.body.list.find((node: {caType: string;}) => node.caType === 'root');
        const intermediate = res.body.list.find((node: {caType: string;}) => node.caType === 'intermediate');

        expect(root.parentCaId).toBe(0);
        expect(intermediate.parentCaId).toBe(rootId);
        expect(intermediate.purpose).toBe('service');

        // security: no private key material anywhere in the payload
        expect(JSON.stringify(res.body)).not.toContain('SECRET');
        expect(res.body.list[0].private_key).toBeUndefined();
        expect(res.body.list[0].public_key).toBeUndefined();
    });
});