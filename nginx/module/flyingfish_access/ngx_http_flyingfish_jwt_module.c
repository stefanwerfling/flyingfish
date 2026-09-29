/*
 * ngx_http_flyingfish_jwt_module — FlyingFish L7 JWT auth as a native nginx module
 * (nginx-native epic, Phase F, F.3). A synchronous auth_request content handler: it
 * reads the request's bearer token and validates it LOCALLY (signature + time claims)
 * with no control-socket round-trip — unlike flyingfish_auth. Responds 200 (allow) on
 * a valid token, 401 when there is no token (so a login flow can prompt), 403 on an
 * invalid/expired/wrong-algorithm token.
 *
 * Directive (http location context):
 *     flyingfish_jwt <secret> [alg=HS256] [leeway=<time>];
 *
 * F.3 pins alg=HS256 (HMAC). Asymmetric algorithms (RS256/ES256/EdDSA) + iss/aud/
 * required-claim checks land in F.4/F.5. The token's own alg header must equal the
 * configured algorithm (no algorithm-confusion) and alg:"none" is always rejected —
 * enforced in ngx_ff_jwt.
 */

#include <ngx_config.h>
#include <ngx_core.h>
#include <ngx_http.h>

#include "ngx_ff_jwt.h"


#define NGX_FF_JWT_MAX_TOKEN  8192   /* reject absurdly large tokens up front */


typedef struct {
    ngx_str_t     secret;    /* HMAC secret (empty → directive not set here) */
    ngx_uint_t    alg;       /* ff_jwt_alg_t */
    ngx_int_t     leeway;    /* clock-skew tolerance, seconds */
} ngx_http_flyingfish_jwt_loc_conf_t;


static ngx_int_t ngx_http_flyingfish_jwt_handler(ngx_http_request_t *r);
static ngx_int_t ngx_http_flyingfish_jwt_allow(ngx_http_request_t *r);
static void *ngx_http_flyingfish_jwt_create_loc_conf(ngx_conf_t *cf);
static char *ngx_http_flyingfish_jwt_merge_loc_conf(ngx_conf_t *cf,
    void *parent, void *child);
static char *ngx_http_flyingfish_jwt(ngx_conf_t *cf, ngx_command_t *cmd, void *conf);


static ngx_command_t  ngx_http_flyingfish_jwt_commands[] = {

    { ngx_string("flyingfish_jwt"),
      NGX_HTTP_LOC_CONF|NGX_CONF_1MORE,
      ngx_http_flyingfish_jwt,
      NGX_HTTP_LOC_CONF_OFFSET,
      0,
      NULL },

      ngx_null_command
};


static ngx_http_module_t  ngx_http_flyingfish_jwt_module_ctx = {
    NULL,                                     /* preconfiguration */
    NULL,                                     /* postconfiguration */

    NULL,                                     /* create main configuration */
    NULL,                                     /* init main configuration */

    NULL,                                     /* create server configuration */
    NULL,                                     /* merge server configuration */

    ngx_http_flyingfish_jwt_create_loc_conf,  /* create location configuration */
    ngx_http_flyingfish_jwt_merge_loc_conf    /* merge location configuration */
};


ngx_module_t  ngx_http_flyingfish_jwt_module = {
    NGX_MODULE_V1,
    &ngx_http_flyingfish_jwt_module_ctx,      /* module context */
    ngx_http_flyingfish_jwt_commands,         /* module directives */
    NGX_HTTP_MODULE,                          /* module type */
    NULL,                                     /* init master */
    NULL,                                     /* init module */
    NULL,                                     /* init process */
    NULL,                                     /* init thread */
    NULL,                                     /* exit thread */
    NULL,                                     /* exit process */
    NULL,                                     /* exit master */
    NGX_MODULE_V1_PADDING
};


static ngx_int_t
ngx_http_flyingfish_jwt_handler(ngx_http_request_t *r)
{
    ngx_int_t                            rc;
    ngx_table_elt_t                     *auth;
    u_char                              *token;
    size_t                               token_len;
    ff_jwt_params_t                      params;
    ff_jwt_result_t                      res;
    ngx_http_flyingfish_jwt_loc_conf_t  *jlcf;

    static const u_char  bearer[] = "Bearer ";

    jlcf = ngx_http_get_module_loc_conf(r, ngx_http_flyingfish_jwt_module);

    if (jlcf->secret.len == 0) {
        return NGX_DECLINED;
    }

    rc = ngx_http_discard_request_body(r);
    if (rc != NGX_OK) {
        return rc;
    }

    auth = r->headers_in.authorization;

    if (auth == NULL || auth->value.len == 0) {
        /* no credentials — 401 so a login/redirect flow can prompt */
        return NGX_HTTP_UNAUTHORIZED;
    }

    /* require the "Bearer " scheme (case-insensitive), then take the token after it */
    if (auth->value.len <= sizeof(bearer) - 1
        || ngx_strncasecmp(auth->value.data, (u_char *) bearer, sizeof(bearer) - 1)
           != 0)
    {
        return NGX_HTTP_FORBIDDEN;
    }

    token = auth->value.data + (sizeof(bearer) - 1);
    token_len = auth->value.len - (sizeof(bearer) - 1);

    if (token_len == 0) {
        return NGX_HTTP_UNAUTHORIZED;
    }

    if (token_len > NGX_FF_JWT_MAX_TOKEN) {
        return NGX_HTTP_FORBIDDEN;
    }

    params.expected_alg = (ff_jwt_alg_t) jlcf->alg;
    params.key = jlcf->secret.data;
    params.key_len = jlcf->secret.len;
    params.now = (long long) ngx_time();
    params.leeway = (long) jlcf->leeway;

    res = ff_jwt_verify(token, token_len, &params);

    if (res == FF_JWT_OK) {
        return ngx_http_flyingfish_jwt_allow(r);
    }

    ngx_log_error(NGX_LOG_INFO, r->connection->log, 0,
                  "flyingfish_jwt: token rejected (%s)", ff_jwt_strerror(res));

    return NGX_HTTP_FORBIDDEN;
}


/* Allow: respond 200 with an empty body so auth_request lets the request through. */
static ngx_int_t
ngx_http_flyingfish_jwt_allow(ngx_http_request_t *r)
{
    ngx_int_t  rc;

    r->headers_out.status = NGX_HTTP_OK;
    r->headers_out.content_length_n = 0;

    rc = ngx_http_send_header(r);

    if (rc == NGX_ERROR || rc > NGX_OK || r->header_only) {
        return rc;
    }

    return ngx_http_send_special(r, NGX_HTTP_LAST);
}


static void *
ngx_http_flyingfish_jwt_create_loc_conf(ngx_conf_t *cf)
{
    ngx_http_flyingfish_jwt_loc_conf_t  *conf;

    conf = ngx_pcalloc(cf->pool, sizeof(ngx_http_flyingfish_jwt_loc_conf_t));
    if (conf == NULL) {
        return NULL;
    }

    /* secret.len == 0 (from pcalloc) means "not set" */
    conf->alg = NGX_CONF_UNSET_UINT;
    conf->leeway = NGX_CONF_UNSET;

    return conf;
}


static char *
ngx_http_flyingfish_jwt_merge_loc_conf(ngx_conf_t *cf, void *parent, void *child)
{
    ngx_http_flyingfish_jwt_loc_conf_t  *prev = parent;
    ngx_http_flyingfish_jwt_loc_conf_t  *conf = child;

    ngx_conf_merge_str_value(conf->secret, prev->secret, "");
    ngx_conf_merge_uint_value(conf->alg, prev->alg, FF_JWT_ALG_HS256);
    ngx_conf_merge_value(conf->leeway, prev->leeway, 0);

    return NGX_CONF_OK;
}


static char *
ngx_http_flyingfish_jwt(ngx_conf_t *cf, ngx_command_t *cmd, void *conf)
{
    ngx_http_flyingfish_jwt_loc_conf_t  *jlcf = conf;

    ngx_str_t                 *value;
    ngx_str_t                  tval;
    ngx_uint_t                 i;
    ngx_http_core_loc_conf_t  *clcf;

    if (jlcf->secret.len != 0) {
        return "is duplicate";
    }

    value = cf->args->elts;

    jlcf->secret = value[1];

    if (jlcf->secret.len == 0) {
        return "has an empty secret";
    }

    /* optional params: alg=<name> and/or leeway=<time> */
    for (i = 2; i < cf->args->nelts; i++) {

        if (ngx_strncmp(value[i].data, "alg=", 4) == 0) {
            tval.data = value[i].data + 4;
            tval.len = value[i].len - 4;

            if (tval.len == 5 && ngx_strncmp(tval.data, "HS256", 5) == 0) {
                jlcf->alg = FF_JWT_ALG_HS256;
            } else {
                return "has an unsupported \"alg\" (only HS256 in this build)";
            }

            continue;
        }

        if (ngx_strncmp(value[i].data, "leeway=", 7) == 0) {
            tval.data = value[i].data + 7;
            tval.len = value[i].len - 7;

            jlcf->leeway = ngx_parse_time(&tval, 1);   /* seconds */

            if (jlcf->leeway == NGX_ERROR) {
                return "has an invalid \"leeway\" value";
            }

            continue;
        }

        return "has an unexpected parameter (expected alg=HS256 or leeway=<time>)";
    }

    /* become the content handler for this (internal auth_request) location */
    clcf = ngx_http_conf_get_module_loc_conf(cf, ngx_http_core_module);
    clcf->handler = ngx_http_flyingfish_jwt_handler;

    return NGX_CONF_OK;
}
