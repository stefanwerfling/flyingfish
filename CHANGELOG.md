# Changelog

All notable changes to FlyingFish are documented here.

## [1.2.0] - 2026-08-24

The 1.2.0 milestone bundles the previously unreleased feature work on `main`
with a security, testing and architecture refactor cycle. It is a single large
release (no intermediate 1.1.x patches).

### Highlights

- **Credential system (#70):** dedicated credential storage with provider
  types and a frontend page; SOCKS removed in favour of credential providers.
- **Let's Encrypt DNS-01 (#58):** DNS-01 challenge with a dedicated hook
  server, wildcard certificate support, and provider options in the frontend.
- **Redis-backed inter-service channel (#29, #14):** HimHIP update channel over
  Redis, configurable via `FLYINGFISH_DB_REDIS_URL`.
- **Framework migration to figtree:** the backend now runs on the `figtree`
  application framework (replacing `flyingfish_core` as the foundation), with
  all services on figtree's service manager and Express upgraded 4 → 5.
- **Database robustness:** `synchronize:true` replaced by TypeORM migrations
  with auto-baseline for existing installs, and sessions moved from in-memory to
  Redis (survive restarts, cluster-ready).

### Added

- Credential database, provider types and frontend management page (#70).
- DNS-01 ACME challenge, hook server and wildcard checks for Let's Encrypt (#58).
- Redis inter-service update channel for HimHIP (#29) and `FLYINGFISH_DB_REDIS_URL` (#14).
- Unix-socket support for nginx configuration (#69).
- Countries map on the dashboard (#37).
- Main-domain matching for request checking (#86).
- HTTP rate limit for the DynDNS server (#83).
- IPv6 support for public-IP detection (how-is-my-public-ip / ipify).
- VPN build with `node-rohc`.
- Jest unit testing, a logger test, and a MariaDB integration test harness.
- `uncaughtException` / `unhandledRejection` process handlers.
- Health checks for Redis / InfluxDB; Redis service in setup and compose.
- Tooltips and info panels for domains and routes; user-credential menu item.
- Dependabot and an SPDX SBOM.

### Changed

- **Boot & services migrated onto figtree** (`BackendApp`, service manager,
  `ServiceAbstract`/`ServiceJobAbstract`); minimal `main.ts`.
- **Sessions stored in Redis** instead of `MemoryStore`.
- **Schema owned by TypeORM migrations** instead of `synchronize:true`, with an
  auto-baseline that stamps pre-existing (1.1.x) schemas instead of recreating
  them, so existing installs upgrade cleanly.
- **NginxService decomposed** (1628 → ~131 lines) into `NginxConfigBuilder`,
  `NginxAccessLog` and `NginxProcess`, behaviour held constant by golden
  snapshots.
- nginx bumped to 1.30.4 (+ njs 0.9.9, headers-more 0.40).
- Base image moved to Debian Bookworm slim (#89); modern rate-limit headers.

### Security

- **CSP hardened:** wildcard sources and `unsafe-inline` removed from
  `script-src` (inline scripts externalised).
- **Default admin password** no longer hard-coded: taken from
  `FLYINGFISH_ADMIN_INIT_PASSWORD` or a strong random value logged once.
- **HimHIP** container reduced from `cap_add: ALL` to `NET_ADMIN`; TLS
  verification restored (`rejectUnauthorized` fallback removed); Node debugger
  made opt-in.
- **DynDNS** brute-force rate limiter enabled.
- Consolidated `.gitignore`, new `.dockerignore` (keeps large artefacts out of
  the build context), and hardened `setup/.env` template.
- CI actions updated (CodeQL checkout@v4 / codeql-action@v3).

### Fixed

- Route handlers now return HTTP 500 on unhandled exceptions instead of hanging.
- Fire-and-forget promise rejections are logged instead of left unhandled.
- Logger falls back to console on `EACCES` instead of crashing.
- IP-location lookup and wildcard handling fixes.

### Tests / CI

- Quality gate: typecheck (all TS workspaces), network-free unit tests, ESLint
  (0 errors), and a MariaDB integration job.
- nginx config snapshot/characterization tests; supertest login API tests.
- Entity ↔ migration schema-drift contract test (guards against silent entity
  drift now that `synchronize:true` is off).
- `strict` TypeScript confirmed across all workspaces.

[1.2.0]: https://github.com/stefanwerfling/flyingfish/compare/v1.1.12...v1.2.0
