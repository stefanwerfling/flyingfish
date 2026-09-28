/*
 * ngx_ff_access_cache — see the header. Standard nginx shared-memory cache pattern
 * (rbtree keyed by crc32 + key-string tiebreak, LRU queue, slab pool + mutex),
 * modelled on ngx_http_limit_req / limit_conn.
 */

#include "ngx_ff_access_cache.h"


typedef struct {
    ngx_rbtree_node_t   node;      /* node.key = crc32 hash of the key string */
    ngx_queue_t         queue;     /* LRU */
    time_t              expires;   /* absolute expiry (ngx_time() + ttl) */
    ngx_uint_t          decision;  /* 1 = allow, 0 = deny */
    u_short             len;       /* key length */
    u_char              data[1];   /* key bytes (collision-safe compare) */
} ngx_ff_cache_node_t;


static void
ngx_ff_cache_rbtree_insert_value(ngx_rbtree_node_t *temp,
    ngx_rbtree_node_t *node, ngx_rbtree_node_t *sentinel)
{
    ngx_rbtree_node_t   **p;
    ngx_ff_cache_node_t  *cn, *cnt;

    for ( ;; ) {

        if (node->key < temp->key) {
            p = &temp->left;

        } else if (node->key > temp->key) {
            p = &temp->right;

        } else {
            /* same hash — order on the key bytes */
            cn = (ngx_ff_cache_node_t *) node;
            cnt = (ngx_ff_cache_node_t *) temp;

            p = (ngx_memn2cmp(cn->data, cnt->data, cn->len, cnt->len) < 0)
                    ? &temp->left : &temp->right;
        }

        if (*p == sentinel) {
            break;
        }

        temp = *p;
    }

    *p = node;
    node->parent = temp;
    node->left = sentinel;
    node->right = sentinel;
    ngx_rbt_red(node);
}


static ngx_ff_cache_node_t *
ngx_ff_cache_find(ngx_ff_cache_ctx_t *cache, ngx_str_t *key, uint32_t hash)
{
    ngx_int_t             rc;
    ngx_rbtree_node_t    *node, *sentinel;
    ngx_ff_cache_node_t  *cn;

    node = cache->sh->rbtree.root;
    sentinel = cache->sh->rbtree.sentinel;

    while (node != sentinel) {

        if (hash < node->key) {
            node = node->left;
            continue;
        }

        if (hash > node->key) {
            node = node->right;
            continue;
        }

        /* hash == node->key — compare the key bytes */
        cn = (ngx_ff_cache_node_t *) node;

        rc = ngx_memn2cmp(key->data, cn->data, key->len, (size_t) cn->len);

        if (rc == 0) {
            return cn;
        }

        node = (rc < 0) ? node->left : node->right;
    }

    return NULL;
}


ngx_int_t
ngx_ff_cache_lookup(ngx_ff_cache_ctx_t *cache, ngx_str_t *key,
    ngx_uint_t *decision)
{
    uint32_t              hash;
    ngx_int_t             found;
    ngx_ff_cache_node_t  *cn;

    hash = ngx_crc32_short(key->data, key->len);
    found = 0;

    ngx_shmtx_lock(&cache->shpool->mutex);

    cn = ngx_ff_cache_find(cache, key, hash);

    if (cn != NULL) {

        if (cn->expires > ngx_time()) {
            *decision = cn->decision;

            /* refresh LRU position */
            ngx_queue_remove(&cn->queue);
            ngx_queue_insert_head(&cache->sh->lru, &cn->queue);

            found = 1;

        } else {
            /* expired — drop it */
            ngx_queue_remove(&cn->queue);
            ngx_rbtree_delete(&cache->sh->rbtree, &cn->node);
            ngx_slab_free_locked(cache->shpool, cn);
        }
    }

    ngx_shmtx_unlock(&cache->shpool->mutex);

    return found;
}


void
ngx_ff_cache_insert(ngx_ff_cache_ctx_t *cache, ngx_str_t *key,
    ngx_uint_t decision)
{
    size_t                size;
    uint32_t              hash;
    ngx_uint_t            i;
    ngx_queue_t          *q;
    ngx_ff_cache_node_t  *cn, *old;

    hash = ngx_crc32_short(key->data, key->len);

    ngx_shmtx_lock(&cache->shpool->mutex);

    cn = ngx_ff_cache_find(cache, key, hash);

    if (cn != NULL) {
        /* refresh an existing decision */
        cn->decision = decision;
        cn->expires = ngx_time() + cache->ttl;

        ngx_queue_remove(&cn->queue);
        ngx_queue_insert_head(&cache->sh->lru, &cn->queue);

        ngx_shmtx_unlock(&cache->shpool->mutex);
        return;
    }

    size = offsetof(ngx_ff_cache_node_t, data) + key->len;

    cn = ngx_slab_alloc_locked(cache->shpool, size);

    /* zone full — evict LRU-tail entries and retry a few times */
    for (i = 0; cn == NULL && i < 8 && !ngx_queue_empty(&cache->sh->lru); i++) {
        q = ngx_queue_last(&cache->sh->lru);
        old = ngx_queue_data(q, ngx_ff_cache_node_t, queue);

        ngx_queue_remove(q);
        ngx_rbtree_delete(&cache->sh->rbtree, &old->node);
        ngx_slab_free_locked(cache->shpool, old);

        cn = ngx_slab_alloc_locked(cache->shpool, size);
    }

    if (cn == NULL) {
        /* still no room — just don't cache this one */
        ngx_shmtx_unlock(&cache->shpool->mutex);
        return;
    }

    cn->node.key = hash;
    cn->decision = decision;
    cn->expires = ngx_time() + cache->ttl;
    cn->len = (u_short) key->len;
    ngx_memcpy(cn->data, key->data, key->len);

    ngx_rbtree_insert(&cache->sh->rbtree, &cn->node);
    ngx_queue_insert_head(&cache->sh->lru, &cn->queue);

    ngx_shmtx_unlock(&cache->shpool->mutex);
}


ngx_int_t
ngx_ff_cache_init_zone(ngx_shm_zone_t *shm_zone, void *data)
{
    ngx_ff_cache_ctx_t  *octx = data;    /* previous zone ctx on reload */
    ngx_ff_cache_ctx_t  *ctx = shm_zone->data;
    ngx_slab_pool_t     *shpool;

    if (octx) {
        /* reload: reuse the existing shared structures */
        ctx->sh = octx->sh;
        ctx->shpool = octx->shpool;
        return NGX_OK;
    }

    shpool = (ngx_slab_pool_t *) shm_zone->shm.addr;
    ctx->shpool = shpool;

    if (shm_zone->shm.exists) {
        ctx->sh = shpool->data;
        return NGX_OK;
    }

    ctx->sh = ngx_slab_alloc(shpool, sizeof(ngx_ff_cache_shctx_t));
    if (ctx->sh == NULL) {
        return NGX_ERROR;
    }

    shpool->data = ctx->sh;

    ngx_rbtree_init(&ctx->sh->rbtree, &ctx->sh->sentinel,
                    ngx_ff_cache_rbtree_insert_value);
    ngx_queue_init(&ctx->sh->lru);

    return NGX_OK;
}
