/*
 * ngx_stream_flyingfish_access_module — FlyingFish L4 (stream) access control as a
 * native nginx module (the "nginx nativ" epic, Phase C), replacing the njs
 * `mainstream.accessAddressStream` js_access handler.
 *
 * Directive (stream server context):
 *     flyingfish_access <control_socket_path> <listen_id>;
 *
 * On each incoming stream connection the access-phase handler makes ONE non-blocking
 * GET to the FlyingFish control unix socket (via the shared ngx_ff_access core) —
 * `GET /njs/address_access` with the client address + listen_id as headers — and
 * allows the connection on HTTP 200, denies on anything else. Any transport error or
 * timeout is fail-closed (deny). Behaviour matches the njs it replaces; the `secret`
 * header the njs sent is omitted because the backend never validated it.
 */

#include <ngx_config.h>
#include <ngx_core.h>
#include <ngx_stream.h>

#include "ngx_flyingfish_access_core.h"
#include "ngx_ff_access_cache.h"


#define NGX_FF_ACCESS_TIMEOUT   2000   /* connect+send+read deadline, ms */
#define NGX_FF_ACCESS_ALLOW     200    /* backend status that means "allow" */
#define NGX_FF_CACHE_TTL_DFLT    10    /* default decision cache lifetime, seconds */


/*
 * Index of the stream realip module's $realip_remote_addr variable, resolved at
 * postconfiguration (NGX_ERROR if realip isn't compiled/declared). Sent per request
 * as the realip_remote_addr header — that is the ONLY value the backend
 * /njs/address_access uses for its blacklist/whitelist decision, and it must match
 * what the njs `$realip_remote_addr` sent (the direct peer under proxy_protocol/
 * realip), not the post-realip client address (c->addr_text). Falls back to
 * c->addr_text when the variable is unavailable/empty (the common no-realip case,
 * where the two are identical anyway).
 */
static ngx_int_t  ngx_ff_stream_realip_index = NGX_ERROR;


typedef struct {
    ngx_ff_cache_ctx_t  *cache;   /* the shared decision-cache zone (or NULL) */
} ngx_stream_flyingfish_access_main_conf_t;


typedef struct {
    ngx_str_t    socket;      /* control unix socket path */
    ngx_str_t    listen_id;   /* the FlyingFish listen id, sent verbatim */
    ngx_msec_t   timeout;     /* control-socket connect+send+read deadline */
    ngx_flag_t   fail_open;   /* on backend unreachable/timeout: allow instead of deny */
    ngx_flag_t   cache;       /* use the shared decision cache for this server */
} ngx_stream_flyingfish_access_srv_conf_t;


typedef struct {
    ngx_ff_access_ctx_t   core;
    ngx_str_t             key;    /* cache key (realip|listen_id), for the insert */
    ngx_int_t             status;
    unsigned              done:1;
} ngx_stream_flyingfish_access_ctx_t;


static ngx_int_t ngx_stream_flyingfish_access_handler(ngx_stream_session_t *s);
static void ngx_stream_flyingfish_access_done(void *data, ngx_int_t status);
static ngx_buf_t *ngx_stream_flyingfish_access_build_request(ngx_pool_t *pool,
    ngx_str_t *realip, ngx_str_t *remote, ngx_str_t *listen_id);
static ngx_int_t ngx_stream_flyingfish_access_init(ngx_conf_t *cf);
static void *ngx_stream_flyingfish_access_create_main_conf(ngx_conf_t *cf);
static void *ngx_stream_flyingfish_access_create_srv_conf(ngx_conf_t *cf);
static char *ngx_stream_flyingfish_access_merge_srv_conf(ngx_conf_t *cf,
    void *parent, void *child);
static char *ngx_stream_flyingfish_access(ngx_conf_t *cf, ngx_command_t *cmd,
    void *conf);
static char *ngx_stream_flyingfish_access_cache(ngx_conf_t *cf,
    ngx_command_t *cmd, void *conf);


static ngx_command_t  ngx_stream_flyingfish_access_commands[] = {

    { ngx_string("flyingfish_access"),
      NGX_STREAM_SRV_CONF|NGX_CONF_2MORE,
      ngx_stream_flyingfish_access,
      NGX_STREAM_SRV_CONF_OFFSET,
      0,
      NULL },

    { ngx_string("flyingfish_access_cache"),
      NGX_STREAM_MAIN_CONF|NGX_CONF_TAKE12,
      ngx_stream_flyingfish_access_cache,
      NGX_STREAM_MAIN_CONF_OFFSET,
      0,
      NULL },

      ngx_null_command
};


static ngx_stream_module_t  ngx_stream_flyingfish_access_module_ctx = {
    NULL,                                          /* preconfiguration */
    ngx_stream_flyingfish_access_init,             /* postconfiguration */

    ngx_stream_flyingfish_access_create_main_conf, /* create main configuration */
    NULL,                                          /* init main configuration */

    ngx_stream_flyingfish_access_create_srv_conf,  /* create server configuration */
    ngx_stream_flyingfish_access_merge_srv_conf    /* merge server configuration */
};


ngx_module_t  ngx_stream_flyingfish_access_module = {
    NGX_MODULE_V1,
    &ngx_stream_flyingfish_access_module_ctx,      /* module context */
    ngx_stream_flyingfish_access_commands,         /* module directives */
    NGX_STREAM_MODULE,                             /* module type */
    NULL,                                          /* init master */
    NULL,                                          /* init module */
    NULL,                                          /* init process */
    NULL,                                          /* init thread */
    NULL,                                          /* exit thread */
    NULL,                                          /* exit process */
    NULL,                                          /* exit master */
    NGX_MODULE_V1_PADDING
};


static ngx_int_t
ngx_stream_flyingfish_access_handler(ngx_stream_session_t *s)
{
    u_char                                    *p;
    ngx_int_t                                  rc;
    ngx_str_t                                  realip;
    ngx_uint_t                                 decision;
    ngx_connection_t                          *c;
    ngx_stream_variable_value_t               *rv;
    ngx_stream_flyingfish_access_ctx_t        *ctx;
    ngx_stream_flyingfish_access_srv_conf_t   *ascf;
    ngx_stream_flyingfish_access_main_conf_t  *amcf;

    ascf = ngx_stream_get_module_srv_conf(s,
        ngx_stream_flyingfish_access_module);

    if (ascf->socket.len == 0) {
        /* not configured for this server — let other access handlers run */
        return NGX_DECLINED;
    }

    ctx = ngx_stream_get_module_ctx(s, ngx_stream_flyingfish_access_module);

    if (ctx != NULL) {
        if (ctx->done) {
            /*
             * Decision is in. Allow on a backend 200. Status 0 means the backend
             * was unreachable / timed out (not a real deny) — fail closed by
             * default, or allow when fail_open is set (availability over strictness).
             * Any other status is a genuine backend deny and is always enforced.
             */
            if (ctx->status == NGX_FF_ACCESS_ALLOW
                || (ctx->status == 0 && ascf->fail_open))
            {
                return NGX_OK;
            }

            return NGX_STREAM_FORBIDDEN;
        }

        /* check still in flight — stay suspended */
        return NGX_AGAIN;
    }

    c = s->connection;

    ctx = ngx_pcalloc(c->pool, sizeof(ngx_stream_flyingfish_access_ctx_t));
    if (ctx == NULL) {
        return NGX_ERROR;
    }

    ngx_stream_set_ctx(s, ctx, ngx_stream_flyingfish_access_module);

    /* the address the backend blacklists on: $realip_remote_addr if realip gave
     * one, else the raw peer (identical when realip isn't in play) */
    realip = c->addr_text;

    if (ngx_ff_stream_realip_index != NGX_ERROR) {
        rv = ngx_stream_get_indexed_variable(s, ngx_ff_stream_realip_index);

        if (rv != NULL && !rv->not_found && rv->len > 0) {
            realip.data = rv->data;
            realip.len = rv->len;
        }
    }

    /* decision cache (opt-in): key = realip|listen_id. A fresh cached decision
     * skips the control-socket round-trip entirely; a real decision is written
     * back in the done handler on a miss. Errors (status 0) are never cached. */
    amcf = ngx_stream_get_module_main_conf(s, ngx_stream_flyingfish_access_module);

    if (ascf->cache && amcf->cache != NULL) {
        ctx->key.len = realip.len + 1 + ascf->listen_id.len;
        ctx->key.data = ngx_pnalloc(c->pool, ctx->key.len);
        if (ctx->key.data == NULL) {
            return NGX_ERROR;
        }

        p = ngx_copy(ctx->key.data, realip.data, realip.len);
        *p++ = '|';
        ngx_memcpy(p, ascf->listen_id.data, ascf->listen_id.len);

        if (ngx_ff_cache_lookup(amcf->cache, &ctx->key, &decision)) {
            /* cache hit — synchronous decision, no socket call */
            ctx->done = 1;
            return decision ? NGX_OK : NGX_STREAM_FORBIDDEN;
        }
    }

    ctx->core.request = ngx_stream_flyingfish_access_build_request(c->pool,
        &realip, &c->addr_text, &ascf->listen_id);
    if (ctx->core.request == NULL) {
        return NGX_ERROR;
    }

    ctx->core.timeout = ascf->timeout;
    ctx->core.handler = ngx_stream_flyingfish_access_done;
    ctx->core.data = s;
    ctx->core.log = c->log;
    ctx->core.pool = c->pool;

    rc = ngx_ff_access_start(&ctx->core, &ascf->socket);

    if (rc != NGX_OK) {
        /* could not even start the check — treat as unreachable (fail_open honored) */
        ngx_log_error(NGX_LOG_ERR, c->log, 0,
                      "flyingfish_access: could not reach control socket %V, %s",
                      &ascf->socket, ascf->fail_open ? "allowing (fail_open)" : "denying");
        ctx->done = 1;
        ctx->status = 0;
        return ascf->fail_open ? NGX_OK : NGX_STREAM_FORBIDDEN;
    }

    return NGX_AGAIN;
}


static void
ngx_stream_flyingfish_access_done(void *data, ngx_int_t status)
{
    ngx_stream_session_t                      *s = data;
    ngx_stream_flyingfish_access_ctx_t        *ctx;
    ngx_stream_flyingfish_access_srv_conf_t   *ascf;
    ngx_stream_flyingfish_access_main_conf_t  *amcf;

    ctx = ngx_stream_get_module_ctx(s, ngx_stream_flyingfish_access_module);

    ctx->status = status;
    ctx->done = 1;

    /* cache a genuine decision (allow on 200, else deny); never cache status 0
     * (backend unreachable/timeout — transient, and subject to fail_open) */
    if (status != 0 && ctx->key.len > 0) {
        ascf = ngx_stream_get_module_srv_conf(s, ngx_stream_flyingfish_access_module);
        amcf = ngx_stream_get_module_main_conf(s, ngx_stream_flyingfish_access_module);

        if (ascf->cache && amcf->cache != NULL) {
            ngx_ff_cache_insert(amcf->cache, &ctx->key,
                status == NGX_FF_ACCESS_ALLOW ? 1 : 0);
        }
    }

    /* resume the phase engine — the access handler now returns the decision */
    ngx_stream_core_run_phases(s);
}


static ngx_buf_t *
ngx_stream_flyingfish_access_build_request(ngx_pool_t *pool, ngx_str_t *realip,
    ngx_str_t *remote, ngx_str_t *listen_id)
{
    size_t      len;
    ngx_buf_t  *b;

    static const char  fmt[] =
        "GET /njs/address_access HTTP/1.0" CRLF
        "Host: localhost" CRLF
        "realip_remote_addr: %V" CRLF
        "remote_addr: %V" CRLF
        "listen_id: %V" CRLF
        "type: stream" CRLF
        "Connection: close" CRLF
        CRLF;

    /* fmt minus the three %V (6 chars) plus the actual values */
    len = sizeof(fmt) - 1 - (3 * 2) + realip->len + remote->len + listen_id->len;

    b = ngx_create_temp_buf(pool, len);
    if (b == NULL) {
        return NULL;
    }

    b->last = ngx_snprintf(b->last, len, fmt, realip, remote, listen_id);

    return b;
}


static void *
ngx_stream_flyingfish_access_create_main_conf(ngx_conf_t *cf)
{
    ngx_stream_flyingfish_access_main_conf_t  *conf;

    conf = ngx_pcalloc(cf->pool,
        sizeof(ngx_stream_flyingfish_access_main_conf_t));
    if (conf == NULL) {
        return NULL;
    }

    /* conf->cache stays NULL until a flyingfish_access_cache directive sets it */

    return conf;
}


static void *
ngx_stream_flyingfish_access_create_srv_conf(ngx_conf_t *cf)
{
    ngx_stream_flyingfish_access_srv_conf_t  *conf;

    conf = ngx_pcalloc(cf->pool,
        sizeof(ngx_stream_flyingfish_access_srv_conf_t));
    if (conf == NULL) {
        return NULL;
    }

    /* ngx_str_t fields are zeroed by pcalloc — socket.len == 0 means "not set" */
    conf->timeout = NGX_CONF_UNSET_MSEC;
    conf->fail_open = NGX_CONF_UNSET;
    conf->cache = NGX_CONF_UNSET;

    return conf;
}


static char *
ngx_stream_flyingfish_access_merge_srv_conf(ngx_conf_t *cf, void *parent,
    void *child)
{
    ngx_stream_flyingfish_access_srv_conf_t  *prev = parent;
    ngx_stream_flyingfish_access_srv_conf_t  *conf = child;

    ngx_conf_merge_str_value(conf->socket, prev->socket, "");
    ngx_conf_merge_str_value(conf->listen_id, prev->listen_id, "0");
    ngx_conf_merge_msec_value(conf->timeout, prev->timeout, NGX_FF_ACCESS_TIMEOUT);
    ngx_conf_merge_value(conf->fail_open, prev->fail_open, 0);
    ngx_conf_merge_value(conf->cache, prev->cache, 0);

    return NGX_CONF_OK;
}


static char *
ngx_stream_flyingfish_access(ngx_conf_t *cf, ngx_command_t *cmd, void *conf)
{
    ngx_stream_flyingfish_access_srv_conf_t  *ascf = conf;

    ngx_str_t   *value;
    ngx_str_t    tval;
    ngx_uint_t   i;

    if (ascf->socket.len != 0) {
        return "is duplicate";
    }

    value = cf->args->elts;

    ascf->socket = value[1];
    ascf->listen_id = value[2];

    /* optional params: timeout=<time> and/or fail_open */
    for (i = 3; i < cf->args->nelts; i++) {

        if (ngx_strncmp(value[i].data, "timeout=", 8) == 0) {
            tval.data = value[i].data + 8;
            tval.len = value[i].len - 8;

            ascf->timeout = ngx_parse_time(&tval, 0);

            if (ascf->timeout == (ngx_msec_t) NGX_ERROR) {
                return "has an invalid \"timeout\" value";
            }

            continue;
        }

        if (ngx_strcmp(value[i].data, "fail_open") == 0) {
            ascf->fail_open = 1;
            continue;
        }

        if (ngx_strcmp(value[i].data, "cache") == 0) {
            ascf->cache = 1;
            continue;
        }

        return "has an unexpected parameter (expected timeout=<time>, fail_open or cache)";
    }

    return NGX_CONF_OK;
}


static char *
ngx_stream_flyingfish_access_cache(ngx_conf_t *cf, ngx_command_t *cmd, void *conf)
{
    ngx_stream_flyingfish_access_main_conf_t  *amcf = conf;

    ssize_t              size;
    ngx_str_t           *value, tval, name = ngx_string("flyingfish_access_cache");
    ngx_uint_t           i;
    ngx_shm_zone_t      *shm_zone;
    ngx_ff_cache_ctx_t  *ctx;

    if (amcf->cache != NULL) {
        return "is duplicate";
    }

    value = cf->args->elts;

    size = ngx_parse_size(&value[1]);

    if (size == NGX_ERROR || size < (ssize_t) (8 * ngx_pagesize)) {
        return "has an invalid or too small \"size\" (min 8 pages)";
    }

    ctx = ngx_pcalloc(cf->pool, sizeof(ngx_ff_cache_ctx_t));
    if (ctx == NULL) {
        return NGX_CONF_ERROR;
    }

    ctx->ttl = NGX_FF_CACHE_TTL_DFLT;

    /* optional ttl=<time> (seconds) */
    for (i = 2; i < cf->args->nelts; i++) {

        if (ngx_strncmp(value[i].data, "ttl=", 4) == 0) {
            tval.data = value[i].data + 4;
            tval.len = value[i].len - 4;

            ctx->ttl = ngx_parse_time(&tval, 1);

            if (ctx->ttl == (time_t) NGX_ERROR) {
                return "has an invalid \"ttl\" value";
            }

            continue;
        }

        return "has an unexpected parameter (expected ttl=<time>)";
    }

    shm_zone = ngx_shared_memory_add(cf, &name, (size_t) size,
        &ngx_stream_flyingfish_access_module);
    if (shm_zone == NULL) {
        return NGX_CONF_ERROR;
    }

    shm_zone->init = ngx_ff_cache_init_zone;
    shm_zone->data = ctx;

    amcf->cache = ctx;

    return NGX_CONF_OK;
}


static ngx_int_t
ngx_stream_flyingfish_access_init(ngx_conf_t *cf)
{
    ngx_str_t                     realip_name = ngx_string("realip_remote_addr");
    ngx_stream_handler_pt        *h;
    ngx_stream_core_main_conf_t  *cmcf;

    /* Resolve $realip_remote_addr once (NGX_ERROR if realip isn't available); the
     * handler reads it per request. get_variable_index registers interest so the
     * value is materialized. */
    ngx_ff_stream_realip_index = ngx_stream_get_variable_index(cf, &realip_name);

    cmcf = ngx_stream_conf_get_module_main_conf(cf, ngx_stream_core_module);

    h = ngx_array_push(&cmcf->phases[NGX_STREAM_ACCESS_PHASE].handlers);
    if (h == NULL) {
        return NGX_ERROR;
    }

    *h = ngx_stream_flyingfish_access_handler;

    return NGX_OK;
}
