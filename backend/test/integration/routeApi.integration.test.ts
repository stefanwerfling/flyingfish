/**
 * API integration tests for the Route controller (supertest + real MariaDB).
 *
 * Covers the auth guard, schema validation and - via a domain + listen fixture
 * built through the API - full HTTP and stream route round-trips
 * (save -> list -> delete), an HTTP route with a proxy_pass location, a stream
 * route with an upstream, and the "listen required" / "duplicate route" guards.
 *
 * Stream routes are exercised via the upstream destination type (DB-only); the
 * ssh_l/ssh_r destination types (which build an ssh user/port graph) are not
 * covered here.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {
    DomainData,
    ListenData,
    Location,
    NginxStreamDestinationType,
    NginxStreamSshR,
    RouteData,
    RouteHttpSave,
    RouteStreamSave,
    StatusCodes,
    UpStream
} from 'flyingfish_schemas';
import request from 'supertest';
import {Domain} from '../../src/Routes/Main/Domain.js';
import {Listen} from '../../src/Routes/Main/Listen.js';
import {Route} from '../../src/Routes/Main/Route.js';
import {buildApiApp, loginAgent} from './apiTestHelpers.js';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

const routes = [new Domain(), new Listen(), new Route()];

const DOMAIN_NAME = 'route.example.com';

const sampleDomain = (): DomainData => {
    return {
        id: 0,
        name: DOMAIN_NAME,
        fix: false,
        recordless: false,
        records: [],
        disable: false,
        parent_id: 0
    };
};

const sampleListen = (port = 8080): ListenData => {
    return {
        id: 0,
        type: 0,
        port: port,
        protocol: 0,
        enable_ipv6: false,
        check_address: false,
        check_address_type: 0,
        name: 'route-listen',
        routeless: false,
        description: '',
        disable: false,
        proxy_protocol: false,
        proxy_protocol_in: false,
        stream_server_variables: []
    };
};

const proxyLocation = (): Location => {
    return {
        id: 0,
        destination_type: 0,
        match: '/',
        proxy_pass: 'http://127.0.0.1:3000',
        auth_enable: false,
        credentials: [],
        websocket_enable: false,
        host_enable: false,
        host_name: '',
        host_name_port: 0,
        xforwarded_scheme_enable: false,
        xforwarded_proto_enable: false,
        xforwarded_for_enable: false,
        xrealip_enable: false,
        variables: []
    };
};

const httpRoute = (domainId: number, listenId: number, locations: Location[] = []): RouteHttpSave => {
    return {
        domainid: domainId,
        http: {
            id: 0,
            listen_id: listenId,
            index: 0,
            ssl: {enable: false, provider: '', email: '', wildcard: false},
            locations: locations,
            http2_enable: false,
            x_frame_options: '',
            wellknown_disabled: false,
            variables: []
        }
    };
};

const upstreamServer = (): UpStream => {
    return {
        id: 0,
        address: '127.0.0.1',
        port: 9000,
        proxy_protocol_out: false
    };
};

const streamRoute = (domainId: number, listenId: number, upstreams: UpStream[] = [upstreamServer()]): RouteStreamSave => {
    return {
        domainid: domainId,
        stream: {
            id: 0,
            listen_id: listenId,
            destination_type: NginxStreamDestinationType.upstream,
            destination_listen_id: 0,
            alias_name: '',
            index: 0,
            isdefault: false,
            use_as_default: false,
            load_balancing_algorithm: '',
            ssh_r_type: NginxStreamSshR.none,
            upstreams: upstreams
        }
    };
};

/**
 * Build the domain + listen prerequisites through the API and return their ids.
 */
const createFixtures = async(agent: ReturnType<typeof request.agent>): Promise<{domainId: number; listenId: number;}> => {
    await agent.post('/json/domain/save').send(sampleDomain());
    const domainList = await agent.get('/json/domain/list');
    const domainId = domainList.body.list.find((d: {name: string;}) => d.name === DOMAIN_NAME).id;

    await agent.post('/json/listen/save').send(sampleListen());
    const listenList = await agent.get('/json/listen/list');
    const listenId = listenList.body.list[0].id;

    return {domainId: domainId, listenId: listenId};
};

const findDomainRoute = (list: RouteData[]): RouteData => {
    return list.find((entry) => entry.domainname === DOMAIN_NAME) as RouteData;
};

describe('Route API (integration)', () => {
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

    test('http save requires a selected listen', async() => {
        const agent = await loginAgent(routes);
        const {domainId} = await createFixtures(agent);

        const res = await agent.post('/json/route/http/save').send(httpRoute(domainId, 0));

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
        expect(res.body.msg).toBe('Please select a listen!');
    });

    test('full http route round-trip: save, list, delete', async() => {
        const agent = await loginAgent(routes);
        const {domainId, listenId} = await createFixtures(agent);

        const save = await agent.post('/json/route/http/save').send(httpRoute(domainId, listenId));
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/route/list');
        const domainRoute = findDomainRoute(list.body.list);
        expect(domainRoute).toBeDefined();
        expect(domainRoute.https).toHaveLength(1);
        expect(domainRoute.https[0].listen_id).toBe(listenId);

        const httpId = domainRoute.https[0].id;
        const del = await agent.post('/json/route/http/delete').send({id: httpId});
        expect(del.body.statusCode).toBe(StatusCodes.OK);

        const after = await agent.get('/json/route/list');
        expect(findDomainRoute(after.body.list).https).toHaveLength(0);
    });

    test('http route with a proxy_pass location persists the location', async() => {
        const agent = await loginAgent(routes);
        const {domainId, listenId} = await createFixtures(agent);

        const save = await agent.post('/json/route/http/save').send(httpRoute(domainId, listenId, [proxyLocation()]));
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/route/list');
        const domainRoute = findDomainRoute(list.body.list);
        expect(domainRoute.https[0].locations).toHaveLength(1);
        expect(domainRoute.https[0].locations[0].match).toBe('/');
    });

    test('http save rejects a duplicate route for the same listen + domain', async() => {
        const agent = await loginAgent(routes);
        const {domainId, listenId} = await createFixtures(agent);

        const first = await agent.post('/json/route/http/save').send(httpRoute(domainId, listenId));
        expect(first.body.statusCode).toBe(StatusCodes.OK);

        const second = await agent.post('/json/route/http/save').send(httpRoute(domainId, listenId));
        expect(second.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
        expect(second.body.msg).toBe('Listen route by domain already in used!');
    });

    test('stream save requires a selected listen', async() => {
        const agent = await loginAgent(routes);
        const {domainId} = await createFixtures(agent);

        const res = await agent.post('/json/route/stream/save').send(streamRoute(domainId, 0));

        expect(res.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
        expect(res.body.msg).toBe('Please select a listen!');
    });

    test('full stream route round-trip with an upstream: save, list, delete', async() => {
        const agent = await loginAgent(routes);
        const {domainId, listenId} = await createFixtures(agent);

        const save = await agent.post('/json/route/stream/save').send(streamRoute(domainId, listenId));
        expect(save.body.statusCode).toBe(StatusCodes.OK);

        const list = await agent.get('/json/route/list');
        const domainRoute = findDomainRoute(list.body.list);
        expect(domainRoute.streams).toHaveLength(1);
        expect(domainRoute.streams[0].listen_id).toBe(listenId);
        expect(domainRoute.streams[0].upstreams).toHaveLength(1);
        expect(domainRoute.streams[0].upstreams[0].port).toBe(9000);

        const streamId = domainRoute.streams[0].id;
        const del = await agent.post('/json/route/stream/delete').send({id: streamId});
        expect(del.body.statusCode).toBe(StatusCodes.OK);

        const after = await agent.get('/json/route/list');
        expect(findDomainRoute(after.body.list).streams).toHaveLength(0);
    });

    test('stream save rejects a duplicate stream for the same listen + domain', async() => {
        const agent = await loginAgent(routes);
        const {domainId, listenId} = await createFixtures(agent);

        const first = await agent.post('/json/route/stream/save').send(streamRoute(domainId, listenId));
        expect(first.body.statusCode).toBe(StatusCodes.OK);

        const second = await agent.post('/json/route/stream/save').send(streamRoute(domainId, listenId));
        expect(second.body.statusCode).toBe(StatusCodes.INTERNAL_ERROR);
        expect(second.body.msg).toBe('You can only add one stream by this listen to this domain!');
    });
});