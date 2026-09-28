/*
 * ngx_ff_access_metrics — see the header. A tiny fixed-size shared zone holding the
 * counter struct; a global pointer to it (set at zone init, inherited by workers);
 * atomic increments via the header macro; a Prometheus-style text renderer.
 */

#include "ngx_ff_access_metrics.h"


#define NGX_FF_METRICS_ZONE_SIZE  (16 * 1024)


ngx_ff_metrics_t  *ngx_ff_metrics = NULL;

static ngx_str_t   ngx_ff_metrics_zone_name = ngx_string("flyingfish_access_metrics");


static ngx_int_t
ngx_ff_metrics_init_zone(ngx_shm_zone_t *shm_zone, void *data)
{
    ngx_ff_metrics_t  *octx = data;   /* previous on reload */
    ngx_slab_pool_t   *shpool;

    if (octx) {
        /* reload: keep the existing counters */
        ngx_ff_metrics = octx;
        shm_zone->data = octx;
        return NGX_OK;
    }

    shpool = (ngx_slab_pool_t *) shm_zone->shm.addr;

    if (shm_zone->shm.exists) {
        ngx_ff_metrics = shpool->data;
        shm_zone->data = ngx_ff_metrics;
        return NGX_OK;
    }

    ngx_ff_metrics = ngx_slab_calloc(shpool, sizeof(ngx_ff_metrics_t));
    if (ngx_ff_metrics == NULL) {
        return NGX_ERROR;
    }

    shpool->data = ngx_ff_metrics;
    shm_zone->data = ngx_ff_metrics;

    return NGX_OK;
}


ngx_int_t
ngx_ff_metrics_add_zone(ngx_conf_t *cf, void *tag)
{
    ngx_shm_zone_t  *shm_zone;

    shm_zone = ngx_shared_memory_add(cf, &ngx_ff_metrics_zone_name,
        NGX_FF_METRICS_ZONE_SIZE, tag);
    if (shm_zone == NULL) {
        return NGX_ERROR;
    }

    /* idempotent: a second flyingfish_access_status location reuses the zone */
    shm_zone->init = ngx_ff_metrics_init_zone;

    return NGX_OK;
}


ngx_int_t
ngx_ff_metrics_format(ngx_pool_t *pool, ngx_str_t *out)
{
    u_char            *p;
    ngx_ff_metrics_t   snap;

    static const char  fmt[] =
        "# FlyingFish access modules" CRLF
        "flyingfish_access_stream_allow %uA" CRLF
        "flyingfish_access_stream_deny %uA" CRLF
        "flyingfish_access_stream_error %uA" CRLF
        "flyingfish_access_stream_cache_hit %uA" CRLF
        "flyingfish_access_stream_cache_miss %uA" CRLF
        "flyingfish_access_http_allow %uA" CRLF
        "flyingfish_access_http_deny %uA" CRLF
        "flyingfish_access_http_unauth %uA" CRLF
        "flyingfish_access_http_error %uA" CRLF;

    if (ngx_ff_metrics == NULL) {
        ngx_str_set(out, "# FlyingFish access metrics not enabled" CRLF);
        return NGX_OK;
    }

    /* a plain read snapshot — counters are monotonic, exactness across the 9 reads
     * doesn't matter for a scrape */
    snap = *ngx_ff_metrics;

    /* fmt minus the nine %uA (18 chars) plus room for nine 20-digit values */
    out->data = ngx_pnalloc(pool, sizeof(fmt) - 1 - (9 * 3) + (9 * NGX_ATOMIC_T_LEN));
    if (out->data == NULL) {
        return NGX_ERROR;
    }

    p = ngx_sprintf(out->data, fmt,
        snap.stream_allow, snap.stream_deny, snap.stream_error,
        snap.stream_cache_hit, snap.stream_cache_miss,
        snap.http_allow, snap.http_deny, snap.http_unauth, snap.http_error);

    out->len = p - out->data;

    return NGX_OK;
}
