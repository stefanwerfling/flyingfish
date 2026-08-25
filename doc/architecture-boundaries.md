# Architecture boundaries: figtree · core · apps

This note defines the intended layering of FlyingFish and how the boundary
between the shared `flyingfish_core` library and the application workspaces is
being sharpened. It is the reference for refactoring step 4.2 (core↔backend
boundary).

## Layers

```
figtree            framework (generic, reusable)
   ▲               Config, Logger, DBHelper, HttpServer/DefaultRoute,
   │               Redis, Crypto, PluginSystem, ServiceAbstract, BackendApp
   │
flyingfish_core    FlyingFish domain (shared across the apps)
   ▲               TypeORM entities, DB services, providers
   │               (Credential/DynDns/SslCert), DNS record types
   │
apps               backend · ddnsserver · sshserver · himhip · vpn
```

- **figtree** is the framework foundation (consumed as a git dependency). It
  owns everything generic: configuration, logging, DB access, the HTTP server
  and route base classes, Redis, crypto, the plugin system and the service
  manager.
- **flyingfish_core** should hold only the **FlyingFish domain** that the apps
  genuinely share: the TypeORM entities, the DB services over them, the provider
  contracts/implementations, and the DNS record types.
- **apps** compose figtree + core into runnable services.

## Current reality (transitional)

Only the **backend** has been migrated onto figtree so far. `ddnsserver`,
`sshserver` and `himhip` still consume framework classes from `flyingfish_core`.
Because of that, `flyingfish_core` currently **duplicates** several framework
concerns that figtree also provides:

| core area | classification | status |
|---|---|---|
| Entities (`*DB`), DB services (`*ServiceDB`), `DBEntitiesLoader` | domain | keep in core |
| Providers (`ProviderType`, `BaseProviders`, `ICredential*`, `ISslCert*`, `IDynDnsClient`) | domain | keep in core |
| DNS record types (`inc/Dns`) | domain | keep in core |
| `Config` | framework dup | **backend migrated → FlyingFishConfig** (enforced) |
| `Logger` | framework dup | **backend migrated → figtree Logger** (enforced); ddns/ssh/himhip still use core Logger |
| `DBHelper` | framework dup | backend co-inits it via `CoreDBInitHook`; figtree owns migrations |
| `DefaultRoute` | framework dup | **main-API routes migrated → figtree DefaultRoute** (enforced); the two njs control routes still use core `DefaultRoute` (mounted on core `USHttpServer`) |
| `BaseHttpServer`, `USHttpServer`, `Session` | framework dup | the nginx-control server (`NginxControlHttpServer`) still extends core `USHttpServer`; migrating it frees the last core `DefaultRoute` users |
| `PluginManager`, `PluginServiceNames` | framework dup | bridged in the backend boot |
| `RedisClient` | framework dup | **backend migrated → figtree RedisClient** (enforced); this is the singleton `RedisDBService` actually connects |
| `RedisChannel`, `RedisSubscribe` | framework dup | backend already imports figtree's `RedisChannel` (HimHIP/SshConfigChannel); himhip still uses core |
| `RedisChannels` (enum of FlyingFish channel names) | **domain** | keep in core — the channel-name set is FlyingFish's, not framework |
| `Utils.DateHelper` | shared util | **backend migrated → figtree DateHelper** (enforced); `getCurrentDbTime()` → figtree `getCurrentTime()` |
| `Utils.FileHelper` | shared util | **backend migrated → figtree FileHelper** (enforced); `mkdir`/`directoryExist` → figtree `DirHelper` |
| `Crypto` (`CertificateHelper`, `JwkHelper`), remaining `Utils` (`SimpleProcessAwait` — absent in figtree) | shared util | evaluate: figtree vs keep |

## Target end-state

Remove the framework duplicates from `flyingfish_core` so that:

- `flyingfish_core` = **FlyingFish domain only** (entities, DB services,
  providers, DNS).
- every app reads framework concerns from **figtree**.

This is gated on migrating `ddnsserver`/`sshserver`/`himhip` onto figtree too, so
it happens incrementally, one concern at a time, not in a single big-bang change.

## Enforcement

`backend/.eslintrc.json` carries a `no-restricted-imports` guard that encodes the
boundary already achieved and prevents regressions:

- **`Config` from `flyingfish_core` is banned in backend.** The backend config
  source of truth is `Application/Config/FlyingFishConfig`; core consumers read
  it through the seated `Application/Config/CoreConfigBridge` (the single file
  exempted from the rule).
- **`Logger` from `flyingfish_core` is banned in backend.** Backend logs through
  figtree's `Logger` (`import {Logger} from 'figtree'`), which is the logger the
  figtree boot already initialises and which reads `FlyingFishConfig` directly.
  `flyingfish_core`'s own classes keep logging through core `Logger`; that stays
  until `ddnsserver`/`sshserver`/`himhip` migrate onto figtree.
- **`DateHelper` from `flyingfish_core` is banned in backend.** Backend uses
  figtree's `DateHelper`; core's `getCurrentDbTime()` maps to figtree's
  `getCurrentTime()` (identical: `Date.now()/1000`).
- **`FileHelper` from `flyingfish_core` is banned in backend.** Backend uses
  figtree's `FileHelper`; the directory ops `mkdir`/`directoryExist` live on
  figtree's `DirHelper` (core kept them on `FileHelper`). `SimpleProcessAwait`
  has no figtree equivalent and stays on core.
- **`DefaultRoute` from `flyingfish_core` is banned in backend.** The main-API
  controllers extend figtree's schema-driven `DefaultRoute` and gate auth with
  `Application/Server/FlyingFishRouteCheckUserLogin` (a `checkUserLogin`
  function that mirrors core's old `isUserLogin`; `isFlyingFishUserLogin` is its
  no-response predicate for routes that branch on login state). The two njs
  control routes (`src/Routes/Njs/*`) are exempted via an `overrides` entry
  because they mount on the core `USHttpServer`; they migrate when that server
  moves onto figtree's `HttpServer`.

As each further framework concern is migrated off core in the backend, add its
export name(s) to that rule's `importNames` list to lock the migration in.
