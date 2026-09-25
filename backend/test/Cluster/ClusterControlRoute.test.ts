/**
 * Tests for clusterserver's `POST /cluster/control` (Cluster/Mesh epic 9.5.12.4/.6):
 * the HTTP leg the local Hub uses to ask this clusterserver to dial a mesh peer and
 * relay a control request/reply. Drives the real Express route (imported directly from
 * the clusterserver package — same monorepo, no network) via supertest; no mesh, no DB.
 * This was, per the design scouting, the one HTTP leg with no existing coverage at all.
 */
import {jest} from '@jest/globals';
import bodyParser from 'body-parser';
import express, {Express} from 'express';
import request from 'supertest';
// eslint-disable-next-line import/no-relative-packages -- same monorepo, no publishable package boundary between clusterserver and this test
import {Cluster, ClusterControlProxyController, ClusterNodeStatus} from '../../../clusterserver/src/Routes/Main/Cluster.js';

const status: ClusterNodeStatus = {nodeUid: 'node-a', purpose: 'cluster', commonName: 'cluster@node-a', enrolled: true};

const buildApp = (controlController?: ClusterControlProxyController): Express => {
    const app = express();

    app.use(bodyParser.json());
    app.use(new Cluster(status, undefined, controlController).getExpressRouter());

    return app;
};

describe('POST /cluster/control', () => {
    test('mesh not active on this node (no controller handler) -> ok:false, still HTTP 200', async() => {
        const res = await request(buildApp())
        .post('/cluster/control')
        .send({nodeUid: 'node-b', method: 'domain.list', payload: {}});

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ok: false, error: expect.stringContaining('not active')});
    });

    test('relays a successful reply from the control handler, passing nodeUid/method/payload through', async() => {
        const handler = jest.fn(async() => ({ok: true, payload: {list: [{id: 1}]}}));
        const res = await request(buildApp({handler}))
        .post('/cluster/control')
        .send({nodeUid: 'node-b', method: 'domain.list', payload: {foo: 'bar'}});

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ok: true, payload: {list: [{id: 1}]}});
        expect(handler).toHaveBeenCalledWith('node-b', 'domain.list', {foo: 'bar'});
    });

    test('a rejecting handler (e.g. "no peer" / timeout from ClusterControl.request) -> ok:false, never a raw 500', async() => {
        const handler = jest.fn(async() => {
            throw new Error("ClusterControl: no peer 'node-b'");
        });
        const res = await request(buildApp({handler}))
        .post('/cluster/control')
        .send({nodeUid: 'node-b', method: 'domain.list', payload: {}});

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ok: false, error: expect.stringContaining("no peer 'node-b'")});
    });

    test('a malformed body (missing method) is rejected by schema validation before the handler runs', async() => {
        const handler = jest.fn(async() => ({ok: true}));
        const res = await request(buildApp({handler}))
        .post('/cluster/control')
        .send({nodeUid: 'node-b'});

        expect(handler).not.toHaveBeenCalled();
        expect(res.body).not.toEqual({ok: true});
    });
});
