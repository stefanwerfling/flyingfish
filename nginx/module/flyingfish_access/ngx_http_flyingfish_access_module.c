/*
 * ngx_http_flyingfish_access_module — FlyingFish L7 (http) basic-auth check as a native
 * nginx module (the "nginx nativ" epic, Phase C), replacing the njs
 * `mainhttp.authorizeHttp` js_content handler.
 *
 * Directive (http location context):
 *     flyingfish_auth <control_socket_path> <location_id>;
 *
 * It is the content handler for the internal `/auth<id>` location that the generated
 * config points `auth_request` at. It reads the request's Authorization header and,
 * via the shared ngx_ff_access core, makes ONE non-blocking GET to the control socket
 * (`GET /njs/auth_basic` with the authheader + location_id) — responding 200 (allow)
 * on backend 200, 403 (deny) otherwise, and 401 when there is no Authorization header
 * at all (so the parent location's auth_basic realm prompts for credentials). Matches
 * the njs it replaces.
 *
 * An optional `secret=<value>` param (the shared FLYINGFISH_NGINX_SECRET) is sent as a
 * `secret` header so the control endpoint can reject calls that did not come from the
 * generated config — defense-in-depth behind the unix socket. Omitted when unset.
 */

#include <ngx_config.h>
#include <ngx_core.h>
#include <ngx_http.h>

#include "ngx_flyingfish_access_core.h"
#include "ngx_ff_access_metrics.h"


#define NGX_FF_AUTH_TIMEOUT   2000   /* connect+send+read deadline, ms */
#define NGX_FF_AUTH_ALLOW     200    /* backend status that means "allow" */


typedef struct {
    ngx_str_t    socket;        /* control unix socket path */
    ngx_str_t    location_id;   /* the FlyingFish location id, sent verbatim */
    ngx_str_t    secret;        /* shared secret sent as the `secret` header (or empty) */
    ngx_msec_t   timeout;       /* control-socket connect+send+read deadline */
    ngx_flag_t   fail_open;     /* on backend unreachable/timeout: allow instead of deny */
} ngx_http_flyingfish_access_loc_conf_t;


typedef struct {
    ngx_ff_access_ctx_t   core;
} ngx_http_flyingfish_access_ctx_t;


static ngx_int_t ngx_http_flyingfish_access_handler(ngx_http_request_t *r);
static void ngx_http_flyingfish_access_done(void *data, ngx_int_t status);
static ngx_buf_t *ngx_http_flyingfish_access_build_request(ngx_pool_t *pool,
    ngx_str_t *authheader, ngx_str_t *location_id, ngx_str_t *secret);
static void *ngx_http_flyingfish_access_create_loc_conf(ngx_conf_t *cf);
static char *ngx_http_flyingfish_access_merge_loc_conf(ngx_conf_t *cf,
    void *parent, void *child);
static char *ngx_http_flyingfish_auth(ngx_conf_t *cf, ngx_command_t *cmd,
    void *conf);
static ngx_int_t ngx_http_flyingfish_status_handler(ngx_http_request_t *r);
static char *ngx_http_flyingfish_status(ngx_conf_t *cf, ngx_command_t *cmd,
    void *conf);


static ngx_command_t  ngx_http_flyingfish_access_commands[] = {

    { ngx_string("flyingfish_auth"),
      NGX_HTTP_LOC_CONF|NGX_CONF_2MORE,
      ngx_http_flyingfish_auth,
      NGX_HTTP_LOC_CONF_OFFSET,
      0,
      NULL },

    { ngx_string("flyingfish_access_status"),
      NGX_HTTP_LOC_CONF|NGX_CONF_NOARGS,
      ngx_http_flyingfish_status,
      NGX_HTTP_LOC_CONF_OFFSET,
      0,
      NULL },

      ngx_null_command
};


static ngx_http_module_t  ngx_http_flyingfish_access_module_ctx = {
    NULL,                                        /* preconfiguration */
    NULL,                                        /* postconfiguration */

    NULL,                                        /* create main configuration */
    NULL,                                        /* init main configuration */

    NULL,                                        /* create server configuration */
    NULL,                                        /* merge server configuration */

    ngx_http_flyingfish_access_create_loc_conf,  /* create location configuration */
    ngx_http_flyingfish_access_merge_loc_conf    /* merge location configuration */
};


ngx_module_t  ngx_http_flyingfish_access_module = {
    NGX_MODULE_V1,
    &ngx_http_flyingfish_access_module_ctx,      /* module context */
    ngx_http_flyingfish_access_commands,         /* module directives */
    NGX_HTTP_MODULE,                             /* module type */
    NULL,                                        /* init master */
    NULL,                                        /* init module */
    NULL,                                        /* init process */
    NULL,                                        /* init thread */
    NULL,                                        /* exit thread */
    NULL,                                        /* exit process */
    NULL,                                        /* exit master */
    NGX_MODULE_V1_PADDING
};


static ngx_int_t
ngx_http_flyingfish_access_handler(ngx_http_request_t *r)
{
    ngx_int_t                               rc;
    ngx_table_elt_t                        *auth;
    ngx_http_flyingfish_access_ctx_t       *ctx;
    ngx_http_flyingfish_access_loc_conf_t  *flcf;

    flcf = ngx_http_get_module_loc_conf(r, ngx_http_flyingfish_access_module);

    if (flcf->socket.len == 0) {
        return NGX_DECLINED;
    }

    rc = ngx_http_discard_request_body(r);
    if (rc != NGX_OK) {
        return rc;
    }

    auth = r->headers_in.authorization;

    if (auth == NULL || auth->value.len == 0) {
        /* no credentials — 401 so the parent auth_basic realm prompts */
        ngx_ff_metric_inc(http_unauth);
        return NGX_HTTP_UNAUTHORIZED;
    }

    ctx = ngx_pcalloc(r->pool, sizeof(ngx_http_flyingfish_access_ctx_t));
    if (ctx == NULL) {
        return NGX_HTTP_INTERNAL_SERVER_ERROR;
    }

    ngx_http_set_ctx(r, ctx, ngx_http_flyingfish_access_module);

    ctx->core.request = ngx_http_flyingfish_access_build_request(r->pool,
        &auth->value, &flcf->location_id, &flcf->secret);
    if (ctx->core.request == NULL) {
        return NGX_HTTP_INTERNAL_SERVER_ERROR;
    }

    ctx->core.timeout = flcf->timeout;
    ctx->core.handler = ngx_http_flyingfish_access_done;
    ctx->core.data = r;
    ctx->core.log = r->connection->log;
    ctx->core.pool = r->pool;

    rc = ngx_ff_access_start(&ctx->core, &flcf->socket);

    if (rc != NGX_OK) {
        /* could not even start the check — unreachable (fail_open honored) */
        ngx_log_error(NGX_LOG_ERR, r->connection->log, 0,
                      "flyingfish_auth: could not reach control socket %V, %s",
                      &flcf->socket, flcf->fail_open ? "allowing (fail_open)" : "denying");

        ngx_ff_metric_inc(http_error);

        if (!flcf->fail_open) {
            ngx_ff_metric_inc(http_deny);
            return NGX_HTTP_FORBIDDEN;
        }

        ngx_ff_metric_inc(http_allow);

        /* fail_open: allow — respond 200 empty so auth_request passes */
        r->headers_out.status = NGX_HTTP_OK;
        r->headers_out.content_length_n = 0;

        rc = ngx_http_send_header(r);

        if (rc == NGX_ERROR || rc > NGX_OK || r->header_only) {
            return rc;
        }

        return ngx_http_send_special(r, NGX_HTTP_LAST);
    }

    /* keep the request alive while the check is in flight */
    r->main->count++;

    return NGX_DONE;
}


static void
ngx_http_flyingfish_access_done(void *data, ngx_int_t status)
{
    ngx_int_t                               rc;
    ngx_http_request_t                     *r = data;
    ngx_connection_t                       *c = r->connection;
    ngx_http_flyingfish_access_loc_conf_t  *flcf;

    flcf = ngx_http_get_module_loc_conf(r, ngx_http_flyingfish_access_module);

    /*
     * Allow on backend 200. Status 0 = backend unreachable/timeout (not a real
     * deny) — fail closed by default, or allow when fail_open is set. Any other
     * status is a genuine backend deny and is always enforced.
     */
    if (status == 0) {
        ngx_ff_metric_inc(http_error);
    }

    if (status != NGX_FF_AUTH_ALLOW
        && !(status == 0 && flcf->fail_open))
    {
        /* deny — count a genuine policy deny (status 0 is already counted as error) */
        if (status != 0) {
            ngx_ff_metric_inc(http_deny);
        }

        ngx_http_finalize_request(r, NGX_HTTP_FORBIDDEN);

    } else {
        /* allow — respond 200 empty so auth_request lets the request through */
        ngx_ff_metric_inc(http_allow);

        r->headers_out.status = NGX_HTTP_OK;
        r->headers_out.content_length_n = 0;

        rc = ngx_http_send_header(r);

        if (rc == NGX_ERROR || rc > NGX_OK || r->header_only) {
            ngx_http_finalize_request(r, rc);
        } else {
            ngx_http_finalize_request(r, ngx_http_send_special(r, NGX_HTTP_LAST));
        }
    }

    /*
     * This callback fires from the control-socket connection's event, not the client
     * connection's — so nginx will not run the client connection's posted requests
     * (the auth_request parent that ngx_http_finalize_request just posted) on its own.
     * Drive them explicitly, exactly like the upstream module does after finalizing
     * from the upstream connection.
     */
    ngx_http_run_posted_requests(c);
}


static ngx_buf_t *
ngx_http_flyingfish_access_build_request(ngx_pool_t *pool, ngx_str_t *authheader,
    ngx_str_t *location_id, ngx_str_t *secret)
{
    size_t      len;
    ngx_buf_t  *b;
    ngx_str_t   sec_hdr;

    static const char  sec_fmt[] = "secret: %V" CRLF;

    static const char  fmt[] =
        "GET /njs/auth_basic HTTP/1.0" CRLF
        "Host: localhost" CRLF
        "authheader: %V" CRLF
        "location_id: %V" CRLF
        "%V"                       /* prebuilt secret header line, or empty */
        "Connection: close" CRLF
        CRLF;

    /* build the optional secret header only when a secret is configured */
    ngx_str_null(&sec_hdr);

    if (secret->len > 0) {
        sec_hdr.len = sizeof(sec_fmt) - 1 - 2 + secret->len;
        sec_hdr.data = ngx_pnalloc(pool, sec_hdr.len);
        if (sec_hdr.data == NULL) {
            return NULL;
        }
        ngx_snprintf(sec_hdr.data, sec_hdr.len, sec_fmt, secret);
    }

    /* fmt minus the three %V (6 chars) plus the actual values */
    len = sizeof(fmt) - 1 - (3 * 2)
          + authheader->len + location_id->len + sec_hdr.len;

    b = ngx_create_temp_buf(pool, len);
    if (b == NULL) {
        return NULL;
    }

    b->last = ngx_snprintf(b->last, len, fmt, authheader, location_id, &sec_hdr);

    return b;
}


static void *
ngx_http_flyingfish_access_create_loc_conf(ngx_conf_t *cf)
{
    ngx_http_flyingfish_access_loc_conf_t  *conf;

    conf = ngx_pcalloc(cf->pool,
        sizeof(ngx_http_flyingfish_access_loc_conf_t));
    if (conf == NULL) {
        return NULL;
    }

    /* ngx_str_t fields are zeroed by pcalloc — socket.len == 0 means "not set" */
    conf->timeout = NGX_CONF_UNSET_MSEC;
    conf->fail_open = NGX_CONF_UNSET;

    return conf;
}


static char *
ngx_http_flyingfish_access_merge_loc_conf(ngx_conf_t *cf, void *parent, void *child)
{
    ngx_http_flyingfish_access_loc_conf_t  *prev = parent;
    ngx_http_flyingfish_access_loc_conf_t  *conf = child;

    ngx_conf_merge_str_value(conf->socket, prev->socket, "");
    ngx_conf_merge_str_value(conf->location_id, prev->location_id, "0");
    ngx_conf_merge_str_value(conf->secret, prev->secret, "");
    ngx_conf_merge_msec_value(conf->timeout, prev->timeout, NGX_FF_AUTH_TIMEOUT);
    ngx_conf_merge_value(conf->fail_open, prev->fail_open, 0);

    return NGX_CONF_OK;
}


static char *
ngx_http_flyingfish_auth(ngx_conf_t *cf, ngx_command_t *cmd, void *conf)
{
    ngx_http_flyingfish_access_loc_conf_t  *flcf = conf;

    ngx_str_t                 *value;
    ngx_str_t                  tval;
    ngx_uint_t                 i;
    ngx_http_core_loc_conf_t  *clcf;

    if (flcf->socket.len != 0) {
        return "is duplicate";
    }

    value = cf->args->elts;

    flcf->socket = value[1];
    flcf->location_id = value[2];

    /* optional params: timeout=<time> and/or fail_open */
    for (i = 3; i < cf->args->nelts; i++) {

        if (ngx_strncmp(value[i].data, "timeout=", 8) == 0) {
            tval.data = value[i].data + 8;
            tval.len = value[i].len - 8;

            flcf->timeout = ngx_parse_time(&tval, 0);

            if (flcf->timeout == (ngx_msec_t) NGX_ERROR) {
                return "has an invalid \"timeout\" value";
            }

            continue;
        }

        if (ngx_strcmp(value[i].data, "fail_open") == 0) {
            flcf->fail_open = 1;
            continue;
        }

        if (ngx_strncmp(value[i].data, "secret=", 7) == 0) {
            flcf->secret.data = value[i].data + 7;
            flcf->secret.len = value[i].len - 7;
            continue;
        }

        return "has an unexpected parameter (expected timeout=<time>, fail_open or secret=<value>)";
    }

    /* become the content handler for this location */
    clcf = ngx_http_conf_get_module_loc_conf(cf, ngx_http_core_module);
    clcf->handler = ngx_http_flyingfish_access_handler;

    return NGX_CONF_OK;
}


static ngx_int_t
ngx_http_flyingfish_status_handler(ngx_http_request_t *r)
{
    ngx_int_t     rc;
    ngx_str_t     body;
    ngx_buf_t    *b;
    ngx_chain_t   out;

    if (!(r->method & (NGX_HTTP_GET|NGX_HTTP_HEAD))) {
        return NGX_HTTP_NOT_ALLOWED;
    }

    rc = ngx_http_discard_request_body(r);
    if (rc != NGX_OK) {
        return rc;
    }

    if (ngx_ff_metrics_format(r->pool, &body) != NGX_OK) {
        return NGX_HTTP_INTERNAL_SERVER_ERROR;
    }

    r->headers_out.status = NGX_HTTP_OK;
    r->headers_out.content_length_n = body.len;
    ngx_str_set(&r->headers_out.content_type, "text/plain");
    r->headers_out.content_type_len = r->headers_out.content_type.len;

    rc = ngx_http_send_header(r);

    if (rc == NGX_ERROR || rc > NGX_OK || r->header_only) {
        return rc;
    }

    b = ngx_calloc_buf(r->pool);
    if (b == NULL) {
        return NGX_HTTP_INTERNAL_SERVER_ERROR;
    }

    b->pos = body.data;
    b->last = body.data + body.len;
    b->memory = 1;
    b->last_buf = 1;
    b->last_in_chain = 1;

    out.buf = b;
    out.next = NULL;

    return ngx_http_output_filter(r, &out);
}


static char *
ngx_http_flyingfish_status(ngx_conf_t *cf, ngx_command_t *cmd, void *conf)
{
    ngx_http_core_loc_conf_t  *clcf;

    if (ngx_ff_metrics_add_zone(cf, &ngx_http_flyingfish_access_module) != NGX_OK) {
        return NGX_CONF_ERROR;
    }

    clcf = ngx_http_conf_get_module_loc_conf(cf, ngx_http_core_module);
    clcf->handler = ngx_http_flyingfish_status_handler;

    return NGX_CONF_OK;
}
