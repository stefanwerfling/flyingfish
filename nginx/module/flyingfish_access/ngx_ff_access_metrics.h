/*
 * ngx_ff_access_metrics — shared-memory counters for the FlyingFish access modules
 * (nginx-native epic, the "metrics" improvement; the nginx-Plus live-activity
 * analogue). Both the stream (L4) and http (L7) modules bump atomic counters in a
 * small shared zone, and an http `flyingfish_access_status;` location renders them in
 * a Prometheus-style text format. The zone is process-shared (allocated in the master,
 * inherited by workers), so counts aggregate across all workers without a lock.
 */

#ifndef _NGX_FF_ACCESS_METRICS_H_INCLUDED_
#define _NGX_FF_ACCESS_METRICS_H_INCLUDED_


#include <ngx_config.h>
#include <ngx_core.h>


typedef struct {
    ngx_atomic_t  stream_allow;
    ngx_atomic_t  stream_deny;
    ngx_atomic_t  stream_error;       /* backend unreachable/timeout (status 0) */
    ngx_atomic_t  stream_cache_hit;
    ngx_atomic_t  stream_cache_miss;
    ngx_atomic_t  http_allow;
    ngx_atomic_t  http_deny;          /* 403 */
    ngx_atomic_t  http_unauth;        /* 401 (no credentials) */
    ngx_atomic_t  http_error;         /* backend unreachable/timeout (status 0) */
    ngx_atomic_t  jwt_allow;          /* JWT (F.8): valid token */
    ngx_atomic_t  jwt_deny;           /* malformed/alg/claim/internal → 403 */
    ngx_atomic_t  jwt_unauth;         /* 401 (no bearer token) */
    ngx_atomic_t  jwt_expired;        /* exp passed / nbf in the future */
    ngx_atomic_t  jwt_badsig;         /* signature did not verify */
} ngx_ff_metrics_t;


/* NULL until a flyingfish_access_status location declares the metrics zone; both
 * modules guard on it before incrementing. */
extern ngx_ff_metrics_t  *ngx_ff_metrics;

/* Bump one counter (no-op when metrics aren't enabled). */
#define ngx_ff_metric_inc(field)                                              \
    do { if (ngx_ff_metrics) {                                                \
        (void) ngx_atomic_fetch_add(&ngx_ff_metrics->field, 1);               \
    } } while (0)

/* Declare/attach the shared metrics zone (idempotent). Returns NGX_OK/NGX_ERROR. */
ngx_int_t ngx_ff_metrics_add_zone(ngx_conf_t *cf, void *tag);

/* Render the counters into a freshly pool-allocated Prometheus-style text buffer. */
ngx_int_t ngx_ff_metrics_format(ngx_pool_t *pool, ngx_str_t *out);


#endif /* _NGX_FF_ACCESS_METRICS_H_INCLUDED_ */
