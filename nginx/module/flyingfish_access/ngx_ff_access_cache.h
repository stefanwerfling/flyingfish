/*
 * ngx_ff_access_cache — a small shared-memory decision cache for the FlyingFish access
 * modules (nginx-native epic, the "L4 decision cache" improvement; the nginx-Plus
 * keyval analogue). It caches allow/deny decisions keyed by an opaque string
 * (realip|listen_id for L4) with a per-zone TTL, so most checks skip the control-socket
 * round-trip. An rbtree (keyed by a crc32 of the key, key-string compared on hash
 * collision) + an LRU queue live in a slab-allocated shared zone, guarded by the zone's
 * slab-pool mutex; a full zone evicts LRU-tail entries to make room.
 */

#ifndef _NGX_FF_ACCESS_CACHE_H_INCLUDED_
#define _NGX_FF_ACCESS_CACHE_H_INCLUDED_


#include <ngx_config.h>
#include <ngx_core.h>


/* The shared structures living inside the zone (slab-allocated once). */
typedef struct {
    ngx_rbtree_t       rbtree;
    ngx_rbtree_node_t  sentinel;
    ngx_queue_t        lru;
} ngx_ff_cache_shctx_t;


/* Per-zone context (its config-side handle). */
typedef struct {
    ngx_ff_cache_shctx_t  *sh;
    ngx_slab_pool_t       *shpool;
    time_t                 ttl;   /* decision lifetime, seconds */
} ngx_ff_cache_ctx_t;


/*
 * Look a key up. Returns 1 and sets *decision (1 = allow, 0 = deny) when a fresh
 * entry exists (and refreshes its LRU position); returns 0 on miss or expiry.
 */
ngx_int_t ngx_ff_cache_lookup(ngx_ff_cache_ctx_t *cache, ngx_str_t *key,
    ngx_uint_t *decision);

/*
 * Insert (or refresh) a decision for a key. A full zone evicts LRU-tail entries;
 * if it still cannot allocate, the decision is simply not cached.
 */
void ngx_ff_cache_insert(ngx_ff_cache_ctx_t *cache, ngx_str_t *key,
    ngx_uint_t decision);

/* Shared-zone init callback (ngx_shared_memory_add). */
ngx_int_t ngx_ff_cache_init_zone(ngx_shm_zone_t *shm_zone, void *data);


#endif /* _NGX_FF_ACCESS_CACHE_H_INCLUDED_ */
