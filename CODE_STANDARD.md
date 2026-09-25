# FlyingFish Code Standard

This document describes the conventions actually in use across the FlyingFish monorepo
(`backend`, `core`, `schemas`, `frontend`, `clusterserver`, `dnsserver`, `nginx`, etc.).
It is derived from the established codebase, not from idealized best practice — when in
doubt, match the nearest sibling file over anything written here.

## 1. Form & Structure

### 1.1 Package layout

Every service package follows the same skeleton:

```
<package>/
  src/
    inc/            # library code: entities, services, protocol/aggregate logic
    Application/     # (backend only) app wiring: Config, Db, Hub, Server, Service
    Routes/Main/      # (backend/clusterserver/...) Express route classes
  test/              # tests — ALWAYS a sibling of src/, never inside it
  dist/              # build output, never hand-edited or committed
```

`core/src/inc/Db/MariaDb/Entity/*.ts` holds all TypeORM entities; `core/src/inc/Cluster/*.ts`
holds the mesh/gossip protocol logic; `core/src/inc/Rbac/*.ts` the permission model.
`backend/src/Application/Hub/*.ts` holds the Hub-side singletons/services that wire that
protocol logic into the running node (see §2.3).

### 1.2 File naming

- One class (or one small family of tightly related exports) per file, file name =
  PascalCase class name (`ClusterPeerDirectory.ts` → `class ClusterPeerDirectory`).
- Route handler classes that implement one HTTP action live in a subfolder named after
  the parent resource: `Routes/Main/Domain.ts` wires `/json/domain/*`, and delegates to
  `Routes/Main/Domain/List.ts`, `Domain/Save.ts`, `Domain/Delete.ts`
  (`backend/src/Routes/Main/Domain.ts:1`, `backend/src/Routes/Main/Domain/List.ts:1`).
  Frontend pages follow the same split for **modal dialogs**: `Pages/Domains.ts` owns the
  page, `Pages/Domains/DomainEditModal.ts` and `Domains/DomainRecordEditModal.ts` own the
  edit forms (`frontend/src/inc/Pages/Domains/DomainEditModal.ts:1`). The page file itself
  is not required to split further — `Domains.ts` (613 lines) and `ClusterView.ts`
  (666 lines) both stay single-file; what's expected is that anything that is a *dialog*
  is its own class in a subfolder, not inline DOM-building in the page.
- Test files mirror the source file name with a `.test.ts` suffix, in the matching
  subfolder under `test/`: `core/src/inc/Cluster/ClusterRemoteAccess.ts` →
  `backend/test/Cluster/ClusterRemoteAccess.test.ts`. Integration tests (spin up a real
  DB / cross real Express routes) live under `test/integration/`.

### 1.3 Barrel files & exports

- `core/src/index.ts` and `schemas/src/index.ts` are barrel files: every new public
  class/function/type gets a `export {X} from './inc/.../X.js';` (or `export * from`)
  line, alphabetically grouped near its siblings. Nothing is imported from a package's
  internals via a deep path — always through the package barrel
  (`import {PermissionService} from 'flyingfish_core';` not a relative deep import).
- Named exports only. No `export default` on classes/services (the one exception is
  nginx njs scripts, which the njs runtime requires to `export default {...}`, e.g.
  `nginx/src/mainstream.ts:93`).
- Pure helper functions (no state to hold) are exported as `const` arrow functions, not
  static-only classes: `core/src/inc/Cluster/ClusterRemoteAccess.ts:43`
  (`export const canAccessRemoteResource = async(...) => {...}`). A class is reserved for
  things that hold state or need DI (see §2).

## 2. OOP & Abstraction

### 2.1 Entities

TypeORM entities extend one of the `DBBaseEntity*` base classes
(`core/src/inc/Db/MariaDb/DBBaseEntityId.ts:6`, `DBBaseEntityUuid.ts`, `DBBaseEntityUnid.ts`)
which supply only the primary key column. Every field is `public`, definite-assignment
(`!:`), with a `@Column` decorator and a one-line JSDoc above it describing what it holds
(`core/src/inc/Db/MariaDb/Entity/CaCertificate.ts:24`). No getters/setters, no business
logic on entities — they are pure data containers; logic lives in a `*Service`/`*ServiceDB`
class instead.

**Hard rule:** boolean columns are always `@Column({type: 'bool', ...})`, never
`'tinyint'` or an inferred type — inferring lets TypeORM read it back as a number and 500s
any response schema expecting `Vts.boolean()`.

### 2.2 Services / Managers / Aggregates / Converger / Provider — what each suffix means

The Hub/Cluster subsystem uses a consistent vocabulary; a new class should pick the
suffix that matches what it actually does, not the closest-sounding one:

| Suffix | Meaning | Example |
|---|---|---|
| `*Service` / `*ServiceDB` | CRUD over one entity/table, usually a DI-friendly singleton (`getInstance()`) | `DomainServiceDB`, `core/src/inc/Db/MariaDb/Service/ClusterNodeGroupShareService.ts` |
| `*Manager` | Orchestrates a write path across one or more services + triggers convergence/gossip | `ClusterNodeGroupManager` (`backend/src/Application/Hub/ClusterNodeGroupManager.ts`) |
| `*Converger` | Imports a gossiped/aggregated view into the local DB (one-way: gossip → local) | `ClusterRbacConverger`, `ClusterNodeGroupConverger` |
| `*Provider` | Reads local state and shapes it for something to publish/consume | `ClusterLocalStateProvider` (local DB → gossip-publishable entries) |
| `*Aggregate` (function, not class) | Pure projection: raw gossip entries → a typed view | `aggregateClusterNodeGroups`, `aggregateClusterRbac`, `aggregateClusterDomains` (`core/src/inc/Cluster/*Aggregate.ts`) |
| `*Directory` / `*Store` / `*Registry` | In-memory (non-DB) authoritative collection with its own lifecycle (TTL, etc.) | `ClusterPeerDirectory` |

Route-layer functions that just proxy a request elsewhere (no local decision-making) are
plain exported `async function`s named `proxyX`, not classes:
`backend/src/Application/Hub/ClusterJoin.ts:17` (`proxyClusterJoin`),
`backend/src/Application/Hub/ClusterControlProxy.ts:26` (`proxyClusterControlRequest`).
Both follow the identical shape: read config → `fetch` with an `AbortSignal.timeout` →
`try/catch` → `Logger.getLogger().warn(...)` on failure → always resolve, never throw.

### 2.3 Singletons

Long-lived app-wired services (`HubRegistryService`, `FlyingFishConfig`,
`FlyingFishPermissions`) expose a static `getInstance()` and a `private constructor`, and
are looked up on demand at the call site (`HubRegistryService.getInstance().getRegistry()`)
rather than injected through constructors. Pure/testable logic (`PermissionService`,
anything checked directly by a unit test without booting the app) instead takes its
dependencies through the constructor as an interface, so tests can supply a fake:

```ts
// core/src/inc/Rbac/PermissionService.ts:68
export class PermissionService {
    private readonly _source: IRbacDataSource;
    public constructor(source: IRbacDataSource) { this._source = source; }
```

Rule of thumb: if a unit test needs to construct it without a DB/app, it takes an
injected interface; if it's app-lifetime infrastructure, it's a singleton.

### 2.4 Interfaces vs. type aliases

- `interface` for something implemented by multiple concrete classes / injected as a
  dependency seam (`IRbacDataSource`, `ICredential`).
- `type` for everything else: DTOs, unions, structural "shapes" passed between functions
  (`RbacResource`, `ClusterShareLike`). Discriminated/union shapes are common:
  `export type RbacResource = {type: string; id: number;} | {type: string; uuid: string;};`
  (`core/src/inc/Rbac/PermissionService.ts:8`).
- No enums observed for these string-tag unions — plain string literal unions
  (`'read' | 'write'`) are preferred over `enum`.

### 2.5 Composition over inheritance

Almost no inheritance beyond the two required base classes (`DBBaseEntity*` for entities,
`DefaultRoute` for routes, `BasePage` for frontend pages). Everything else composes:
a Route class composes handler classes (`Domain.ts` + `Domain/List.ts`), a page composes
modal classes (`Domains.ts` + `DomainEditModal.ts`), aggregation composes small pure
functions rather than a class hierarchy.

## 3. TypeScript Style

- Explicit return types on every public/protected method, even trivial getters
  (`public getId(): number|null { return this._id; }`). Inference is only relied on for
  short local `const`s.
- Access modifiers always explicit: `public constructor(...)`, `private readonly _x`,
  `protected _y`. Private/protected fields are prefixed with `_` (`_source`, `_peers`,
  `_ttlMs`); private *static* helper methods use the same underscore prefix
  (`PermissionService._applies`, `ClusterView._esc`).
- `readonly` on every field set once in the constructor and never reassigned.
- Nullability: `T | null` for "explicitly absent, tracked", `T | undefined` /
  `?:` for "optional input". `!` (definite assignment / non-null assertion) is used
  freely on entity columns and on `data.body!` inside route handlers, where the schema
  layer already guarantees presence.
- Object literals: no shorthand-avoidance — `{nodeUid: nodeUid, host: host}` and
  `{nodeUid, host}` both occur; prefer shorthand for new code, but don't rewrite existing
  call sites just to switch style.
- String templates over concatenation everywhere; single quotes for plain strings.

## 4. Async & Error Handling

- `async`/`await` throughout — no raw `.then()` chains in application code.
- Network/IO-boundary functions (`proxyClusterJoin`, `proxyClusterControlRequest`) never
  throw: they wrap the call in `try/catch`, log with `Logger.getLogger().warn(...)`, and
  return a typed `{ok: false, error}` / `{statusCode: INTERNAL_ERROR, msg}` result. This
  "always resolves" contract is explicitly called out in the JSDoc when it applies
  (`backend/src/Application/Hub/ClusterControlProxy.ts:19`).
- Convergence/import steps that must not abort a larger request on failure are wrapped
  individually with a comment explaining why the failure is swallowed:
  ```ts
  // Best-effort: a converge failure must not fail the aggregate push.
  try {
      await new ClusterRbacConverger().import(aggregateClusterRbac(entries));
  } catch (error) {
      Logger.getLogger().warn('Cluster RBAC convergence failed (will retry on the next aggregate push)', error);
  }
  ```
  (`backend/src/Routes/Main/Registry.ts:283`).
- Route handlers return a typed response object with a `statusCode` field
  (`{statusCode: StatusCodes.UNAUTHORIZED}`) rather than throwing HTTP errors; the
  framework (figtree's `DefaultRoute`) turns schema-validation failures into the error
  response automatically.

## 5. Testing

- **Hard rule:** tests live in `test/` at the package root, sibling to `src/`, mirroring
  its subfolder structure — never inside `src/`.
- Unit tests: `describe('ClassName / behavior', () => { test('...', async() => {...}); })`,
  Jest (`import {jest} from '@jest/globals'`). Test names are full sentences describing
  the scenario and the expected outcome (`'a rejecting handler ... -> ok:false, never a
  raw 500'`), not `it('works')`.
- Route-level tests build a minimal real Express app around the route class under test
  and drive it with `supertest`, rather than mocking Express
  (`backend/test/Cluster/ClusterControlRoute.test.ts:17`). Pure-logic tests instead
  construct the class directly with a hand-built fake dependency (`IRbacDataSource` fake,
  etc.) — no mocking framework needed for those.
- Integration tests (real DB, real cross-package wiring) go in `test/integration/`
  (`backend/test/integration/rbac.integration.test.ts`) and are named
  `*.integration.test.ts`.
- A cross-package relative import in a test (reaching into another package's `src`
  instead of going through its published entry point) is allowed but must carry an
  explicit `eslint-disable-next-line import/no-relative-packages` with a one-line reason
  (`backend/test/Cluster/ClusterControlRoute.test.ts:12`) — treat this as an exception
  granted per-file, not a default.

## 6. API / Route Layer

- One `Routes/Main/<Resource>.ts` class per resource, `extends DefaultRoute`, all wiring
  happens inside `getExpressRouter()` via `this._get(...)` / `this._post(...)`.
- Every route call passes a **fourth argument** describing it: `description`,
  `bodySchema`, `responseBodySchema` (and `querySchema` / `pathSchema` when relevant),
  always referencing a `Schema*` from the `flyingfish_schemas` package — never an inline
  ad-hoc shape.
- The handler receives typed, already-validated data through its `data` parameter
  (`data.body`, `data.query`, `data.params`) — **not** by reading `req` directly. `req` is
  only touched for framework-level concerns the schema layer doesn't cover (session user,
  e.g. `req.session.user?.isLogin`).
- Permission checks happen at the top of the handler, before any work, using
  `hasPermission` / `hasPermissionOnResource` / `requirePermission` from
  `FlyingFishRouteCheckPermission.ts`, with a comment naming the RBAC epic and what the
  check maps to when it's non-obvious (`backend/src/Routes/Main/Domain.ts:53`).
- The handler body delegates the actual work to a dedicated class/function (a
  `Routes/Main/<Resource>/<Action>.ts` handler, a `*Manager`, or a pure aggregate
  function) — it does not itself implement the business logic inline beyond
  orchestration + the permission check.
- Every schema module pairs a `Vts.object({...})` schema constant with an extracted type
  via `ExtractSchemaResultType`, both documented with a one-line JSDoc:
  ```ts
  // schemas/src/Cluster/Registry.ts:8
  export const SchemaClusterPeer = Vts.object({ nodeUid: Vts.string(), ... });
  export type ClusterPeer = ExtractSchemaResultType<typeof SchemaClusterPeer>;
  ```

## 7. Frontend

- Every page `extends BasePage`, lives in `frontend/src/inc/Pages/<Name>.ts`.
- All API calls go through `frontend/src/inc/Api/Registry.ts` (or the matching
  `Api/<Resource>.ts`) — pages never call `fetch`/XHR directly.
- Edit/create dialogs are their own class, built from the shared `.ffr` widget set
  (`FfrModal`, `FfrSection`, `FfrField`, `FfrInput`, `FfrSelect`, `FfrSwitch` from
  `Components/FfrModal.ts`), not hand-built DOM with inline `style="..."` strings — see
  `Pages/Domains/DomainEditModal.ts:1` for the reference shape: the modal class exposes
  plain getter/setter methods (`getName`/`setName`) and the page stays agnostic to the
  widget internals. This became the house style after
  `refactor(frontend): convert all page dialogs to the ffr FfrModal widget set`
  (commit `225ac01`) and applies to *every* page, not just the ones it touched.
- Styling is class-based (`ffx-card`, `ffx-secnote`, CSS variables like `var(--soft)`),
  not inline `style=` attributes on ad-hoc elements — inline styles are reserved for
  one-off layout tweaks (flex gaps on a wrapper), not whole widgets.
- The tree-shell/Datacenter area (`ffx-*` pages: `ClusterView.ts`, `NodeCluster.ts`,
  `SystemMode.ts`) uses a second, deliberately different interaction pattern from `.ffr`:
  edit-in-place inside a card instead of a popup dialog. Its form controls are the
  `Ffx*` widgets in `Components/FfxControls.ts` (`FfxButton`, `FfxInput`, `FfxSelect`,
  `FfxColorInput`, `FfxCheckboxRow`) — each `extends Element` from `bambooo` (the same
  base every FlyingFish widget derives from, e.g. `Pages/IpAccess/IpAccessCountriesWidget.ts`),
  owns its own inline chrome once, and exposes plain `getValue`/`setValue`/`onClick`/
  `onChange` methods, the same shape as `Ffr*`. Do not hand-build `<input>`/`<select>`/
  `<button>` with a literal `style="..."` string on an `ffx-*` page — add a size/variant
  to `FfxControls.ts` instead of copy-pasting the chrome again.
- Destructive actions confirm with `window.confirm(...)` before calling the API
  (`ClusterView.ts:403`), then disable the triggering control until the request settles
  and re-enable it on failure.
- HTML built from user-controlled strings is always passed through the page's `_esc`
  escaping helper before interpolation into a template literal.

## 8. Naming

- Classes/files: PascalCase. Methods/variables/fields: camelCase. DB columns:
  snake_case, matching the entity's `@Column` name.
- Booleans read as a question: `isLogin`, `disable`, `recordless`, `member` (not
  `isMember` inconsistently — match the sibling column names on the same entity).
- Route paths: `/json/<resource>/<action>`, nested resources add a path segment
  (`/json/registry/cluster/node-group/share/delete`), never a query-string action.
- Schema names: `Schema<Thing>` for the request/response validator, `<Thing>` for its
  extracted type, `Schema<Thing>Response` / `Schema<Thing>Request` for endpoint payloads.

## 9. Comments

- English only, everywhere (code, commit messages, everything committed to git) — no
  exceptions.
- Every exported class/function/type/const gets a JSDoc block. It explains **why the
  thing exists and what constraint or design decision shaped it** — epic/slice reference,
  what it's a mirror or counterpart of, what invariant it upholds — not what the code
  visibly does. Compare the good example already in the codebase:
  ```ts
  /**
   * A cluster peer is dropped from the roster if it has not re-announced within
   * this window (~3 missed heartbeats).
   */
  const DEFAULT_TTL_MS = 90000;
  ```
  against a comment that would just restate the name (`// the TTL in ms`) — the latter is
  not the house style.
- Inline `//` comments are reserved for a non-obvious guard, a subtle ordering
  requirement, or a linked design tradeoff — never for restating the next line
  (`backend/src/Routes/Main/Registry.ts:275` explains *why* the nodeUid is captured, not
  that it captures it).
- `@param` on every documented method parameter, one line each, no types repeated (the
  signature already has them).
