/**
 * Characterization test for the figtree ServiceManager degradation contract that
 * FlyingFish's fault-isolation (9.2.5) relies on: a failing Optional or Important
 * service does NOT abort startAll (the boot degrades and continues, and the
 * monitor retries later), while a failing Critical service DOES abort it. If
 * figtree ever changes this, the FF ServiceImportance classification silently
 * loses its meaning - this test guards it. Network/DB-free.
 */
import {ServiceAbstract, ServiceManager} from 'figtree';
import {ServiceImportance} from 'figtree-schemas';

/**
 * Test service with a configurable importance that either starts successfully
 * (recording it) or throws on start.
 */
class TestService extends ServiceAbstract {

    public started: boolean = false;

    protected override readonly _importance: ServiceImportance;

    private readonly _fail: boolean;

    public constructor(name: string, importance: ServiceImportance, fail: boolean) {
        super(name, []);
        this._importance = importance;
        this._fail = fail;
    }

    public override async start(): Promise<void> {
        if (this._fail) {
            throw new Error(`${this.getServiceName()} boom`);
        }

        this.started = true;
    }

}

describe('ServiceManager degradation contract (9.2.5)', () => {
    test('a failing Optional service does not abort startAll and peers still start', async() => {
        const sm = new ServiceManager({autoStartMonitor: false});
        const ok = new TestService('ok', ServiceImportance.Optional, false);

        sm.add(new TestService('optional-boom', ServiceImportance.Optional, true));
        sm.add(ok);

        await expect(sm.startAll()).resolves.toBeUndefined();
        expect(ok.started).toBe(true);
    });

    test('a failing Important service does not abort startAll', async() => {
        const sm = new ServiceManager({autoStartMonitor: false});

        sm.add(new TestService('important-boom', ServiceImportance.Important, true));

        await expect(sm.startAll()).resolves.toBeUndefined();
    });

    test('a failing Critical service aborts startAll', async() => {
        const sm = new ServiceManager({autoStartMonitor: false});

        sm.add(new TestService('critical-boom', ServiceImportance.Critical, true));

        await expect(sm.startAll()).rejects.toThrow(/Critical service/u);
    });
});