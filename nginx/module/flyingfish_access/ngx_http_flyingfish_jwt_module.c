/*
 * ngx_http_flyingfish_jwt_module — FlyingFish L7 JWT auth as a native nginx module
 * (nginx-native epic, Phase F). A synchronous auth_request content handler: it reads
 * the request's bearer token and validates it LOCALLY (signature + time claims) with
 * no control-socket round-trip — unlike flyingfish_auth. Responds 200 (allow) on a
 * valid token, 401 when there is no token (so a login flow can prompt), 403 on an
 * invalid/expired/wrong-algorithm token.
 *
 * Directive (http location context):
 *     flyingfish_jwt alg=<HS256|RS256|ES256|EdDSA>
 *                    (secret=<value> | key_file=<pem-public-key>)
 *                    [kid=<id>] [leeway=<time>];
 *
 * HS256 takes an inline shared secret; RS256/ES256/EdDSA take a PEM public key file
 * (parsed once at config time into an EVP_PKEY, optionally tagged with a kid). The
 * token's own alg header must equal the configured algorithm (no algorithm-confusion)
 * and alg:"none" is always rejected — enforced in ngx_ff_jwt. iss/aud/required-claim
 * checks land in F.5; multi-key kid rotation / JWKS in F.7.
 */

#include <ngx_config.h>
#include <ngx_core.h>
#include <ngx_http.h>

#include <openssl/evp.h>
#include <openssl/pem.h>

#include "ngx_ff_jwt.h"
#include "ngx_ff_access_metrics.h"


#define NGX_FF_JWT_MAX_TOKEN  8192   /* reject absurdly large tokens up front */


typedef struct {
    ngx_uint_t     alg;         /* ff_jwt_alg_t, or NGX_CONF_UNSET_UINT if not set here */
    ngx_str_t      secret;      /* HS* shared secret */
    ff_jwt_key_t  *keys;        /* asymmetric public keys (F.4: a single key) */
    ngx_uint_t     keys_count;
    ngx_int_t      leeway;      /* clock-skew tolerance, seconds */
    ngx_str_t      iss;         /* expected issuer (optional) */
    ngx_str_t      aud;         /* expected audience (optional) */
    ngx_str_t      claim_name;  /* required claim name (optional) */
    ngx_str_t      claim_value; /* required claim value */
} ngx_http_flyingfish_jwt_loc_conf_t;


static ngx_int_t ngx_http_flyingfish_jwt_handler(ngx_http_request_t *r);
static ngx_int_t ngx_http_flyingfish_jwt_allow(ngx_http_request_t *r);
static void *ngx_http_flyingfish_jwt_create_loc_conf(ngx_conf_t *cf);
static char *ngx_http_flyingfish_jwt_merge_loc_conf(ngx_conf_t *cf,
    void *parent, void *child);
static char *ngx_http_flyingfish_jwt(ngx_conf_t *cf, ngx_command_t *cmd, void *conf);
static char *ngx_http_flyingfish_jwt_load_key(ngx_conf_t *cf,
    ngx_http_flyingfish_jwt_loc_conf_t *jlcf, ngx_str_t *path, ngx_str_t *kid);
static void ngx_http_flyingfish_jwt_pkey_cleanup(void *data);


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

    if (jlcf->alg == NGX_CONF_UNSET_UINT) {
        return NGX_DECLINED;
    }

    rc = ngx_http_discard_request_body(r);
    if (rc != NGX_OK) {
        return rc;
    }

    auth = r->headers_in.authorization;

    if (auth == NULL || auth->value.len == 0) {
        /* no credentials — 401 so a login/redirect flow can prompt */
        ngx_ff_metric_inc(jwt_unauth);
        return NGX_HTTP_UNAUTHORIZED;
    }

    /* require the "Bearer " scheme (case-insensitive), then take the token after it */
    if (auth->value.len <= sizeof(bearer) - 1
        || ngx_strncasecmp(auth->value.data, (u_char *) bearer, sizeof(bearer) - 1)
           != 0)
    {
        ngx_ff_metric_inc(jwt_deny);
        return NGX_HTTP_FORBIDDEN;
    }

    token = auth->value.data + (sizeof(bearer) - 1);
    token_len = auth->value.len - (sizeof(bearer) - 1);

    if (token_len == 0) {
        ngx_ff_metric_inc(jwt_unauth);
        return NGX_HTTP_UNAUTHORIZED;
    }

    if (token_len > NGX_FF_JWT_MAX_TOKEN) {
        ngx_ff_metric_inc(jwt_deny);
        return NGX_HTTP_FORBIDDEN;
    }

    ngx_memzero(&params, sizeof(params));
    params.expected_alg = (ff_jwt_alg_t) jlcf->alg;

    if (jlcf->alg == FF_JWT_ALG_HS256) {
        params.key = jlcf->secret.data;
        params.key_len = jlcf->secret.len;
    } else {
        params.keys = jlcf->keys;
        params.keys_count = jlcf->keys_count;
    }

    params.now = (long long) ngx_time();
    params.leeway = (long) jlcf->leeway;

    if (jlcf->iss.len) {
        params.iss = (const char *) jlcf->iss.data;
        params.iss_len = jlcf->iss.len;
    }
    if (jlcf->aud.len) {
        params.aud = (const char *) jlcf->aud.data;
        params.aud_len = jlcf->aud.len;
    }
    if (jlcf->claim_name.len) {
        params.claim_name = (const char *) jlcf->claim_name.data;
        params.claim_name_len = jlcf->claim_name.len;
        params.claim_value = (const char *) jlcf->claim_value.data;
        params.claim_value_len = jlcf->claim_value.len;
    }

    res = ff_jwt_verify(token, token_len, &params);

    if (res == FF_JWT_OK) {
        ngx_ff_metric_inc(jwt_allow);
        return ngx_http_flyingfish_jwt_allow(r);
    }

    /* bucket the rejection for metrics (mutually exclusive) */
    switch (res) {
    case FF_JWT_EXPIRED:
    case FF_JWT_NOT_YET_VALID:
        ngx_ff_metric_inc(jwt_expired);
        break;
    case FF_JWT_BAD_SIGNATURE:
        ngx_ff_metric_inc(jwt_badsig);
        break;
    default:
        ngx_ff_metric_inc(jwt_deny);
        break;
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

    conf->alg = NGX_CONF_UNSET_UINT;   /* UNSET means "not configured here" */
    conf->leeway = NGX_CONF_UNSET;
    /* secret/keys stay zeroed */

    return conf;
}


static char *
ngx_http_flyingfish_jwt_merge_loc_conf(ngx_conf_t *cf, void *parent, void *child)
{
    ngx_http_flyingfish_jwt_loc_conf_t  *prev = parent;
    ngx_http_flyingfish_jwt_loc_conf_t  *conf = child;

    /* inherit an ancestor's config where this location did not set its own */
    if (conf->alg == NGX_CONF_UNSET_UINT) {
        conf->alg = prev->alg;
        conf->secret = prev->secret;
        conf->keys = prev->keys;
        conf->keys_count = prev->keys_count;
        conf->iss = prev->iss;
        conf->aud = prev->aud;
        conf->claim_name = prev->claim_name;
        conf->claim_value = prev->claim_value;
    }

    ngx_conf_merge_value(conf->leeway, prev->leeway, 0);

    return NGX_CONF_OK;
}


static char *
ngx_http_flyingfish_jwt(ngx_conf_t *cf, ngx_command_t *cmd, void *conf)
{
    ngx_http_flyingfish_jwt_loc_conf_t  *jlcf = conf;

    ngx_str_t                 *value;
    ngx_str_t                  tval;
    ngx_str_t                  key_file;
    ngx_str_t                  kid;
    ngx_uint_t                 i;
    ngx_http_core_loc_conf_t  *clcf;

    if (jlcf->alg != NGX_CONF_UNSET_UINT) {
        return "is duplicate";
    }

    ngx_str_null(&key_file);
    ngx_str_null(&kid);

    value = cf->args->elts;

    for (i = 1; i < cf->args->nelts; i++) {

        if (ngx_strncmp(value[i].data, "alg=", 4) == 0) {
            tval.data = value[i].data + 4;
            tval.len = value[i].len - 4;

            if (tval.len == 5 && ngx_strncmp(tval.data, "HS256", 5) == 0) {
                jlcf->alg = FF_JWT_ALG_HS256;
            } else if (tval.len == 5 && ngx_strncmp(tval.data, "RS256", 5) == 0) {
                jlcf->alg = FF_JWT_ALG_RS256;
            } else if (tval.len == 5 && ngx_strncmp(tval.data, "ES256", 5) == 0) {
                jlcf->alg = FF_JWT_ALG_ES256;
            } else if (tval.len == 5 && ngx_strncmp(tval.data, "EdDSA", 5) == 0) {
                jlcf->alg = FF_JWT_ALG_EDDSA;
            } else {
                return "has an unsupported \"alg\" (HS256, RS256, ES256 or EdDSA)";
            }

            continue;
        }

        if (ngx_strncmp(value[i].data, "secret=", 7) == 0) {
            jlcf->secret.data = value[i].data + 7;
            jlcf->secret.len = value[i].len - 7;
            continue;
        }

        if (ngx_strncmp(value[i].data, "key_file=", 9) == 0) {
            key_file.data = value[i].data + 9;
            key_file.len = value[i].len - 9;
            continue;
        }

        if (ngx_strncmp(value[i].data, "kid=", 4) == 0) {
            kid.data = value[i].data + 4;
            kid.len = value[i].len - 4;
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

        if (ngx_strncmp(value[i].data, "iss=", 4) == 0) {
            jlcf->iss.data = value[i].data + 4;
            jlcf->iss.len = value[i].len - 4;
            continue;
        }

        if (ngx_strncmp(value[i].data, "aud=", 4) == 0) {
            jlcf->aud.data = value[i].data + 4;
            jlcf->aud.len = value[i].len - 4;
            continue;
        }

        if (ngx_strncmp(value[i].data, "require=", 8) == 0) {
            u_char  *colon;
            size_t   rlen = value[i].len - 8;

            jlcf->claim_name.data = value[i].data + 8;

            /* require=<name>:<value> — split on the first ':' */
            colon = ngx_strlchr(jlcf->claim_name.data,
                                jlcf->claim_name.data + rlen, ':');
            if (colon == NULL) {
                return "has an invalid \"require\" (expected require=<name>:<value>)";
            }

            jlcf->claim_name.len = colon - jlcf->claim_name.data;
            jlcf->claim_value.data = colon + 1;
            jlcf->claim_value.len = (value[i].data + value[i].len) - (colon + 1);

            if (jlcf->claim_name.len == 0 || jlcf->claim_value.len == 0) {
                return "has an empty name or value in \"require\"";
            }

            continue;
        }

        return "has an unexpected parameter "
               "(expected alg=, secret=, key_file=, kid=, leeway=, "
               "iss=, aud= or require=<name>:<value>)";
    }

    if (jlcf->alg == NGX_CONF_UNSET_UINT) {
        return "requires alg=<HS256|RS256|ES256|EdDSA>";
    }

    if (jlcf->alg == FF_JWT_ALG_HS256) {
        if (jlcf->secret.len == 0) {
            return "alg=HS256 requires a non-empty secret=";
        }
        if (key_file.len != 0) {
            return "alg=HS256 takes secret=, not key_file=";
        }
    } else {
        char  *rv;

        if (key_file.len == 0) {
            return "the asymmetric algorithms require key_file=<pem-public-key>";
        }
        if (jlcf->secret.len != 0) {
            return "the asymmetric algorithms take key_file=, not secret=";
        }

        rv = ngx_http_flyingfish_jwt_load_key(cf, jlcf, &key_file, &kid);
        if (rv != NGX_CONF_OK) {
            return rv;
        }
    }

    /* become the content handler for this (internal auth_request) location */
    clcf = ngx_http_conf_get_module_loc_conf(cf, ngx_http_core_module);
    clcf->handler = ngx_http_flyingfish_jwt_handler;

    return NGX_CONF_OK;
}


/* Load a PEM public key at config time, validate it matches the algorithm, and build
 * the single-key set. The EVP_PKEY is freed via a config-pool cleanup. */
static char *
ngx_http_flyingfish_jwt_load_key(ngx_conf_t *cf,
    ngx_http_flyingfish_jwt_loc_conf_t *jlcf, ngx_str_t *path, ngx_str_t *kid)
{
    ngx_str_t            full;
    u_char              *cpath;
    BIO                 *bio;
    EVP_PKEY            *pkey;
    int                  id, ok;
    ngx_pool_cleanup_t  *cln;

    full = *path;
    if (ngx_conf_full_name(cf->cycle, &full, 1) != NGX_OK) {
        return NGX_CONF_ERROR;
    }

    /* BIO_new_file needs a NUL-terminated path */
    cpath = ngx_pnalloc(cf->pool, full.len + 1);
    if (cpath == NULL) {
        return NGX_CONF_ERROR;
    }
    ngx_memcpy(cpath, full.data, full.len);
    cpath[full.len] = '\0';

    bio = BIO_new_file((char *) cpath, "r");
    if (bio == NULL) {
        return "cannot open key_file";
    }

    pkey = PEM_read_bio_PUBKEY(bio, NULL, NULL, NULL);
    BIO_free(bio);

    if (pkey == NULL) {
        return "cannot parse key_file (expected a PEM public key)";
    }

    id = EVP_PKEY_base_id(pkey);
    ok = 0;

    switch (jlcf->alg) {
    case FF_JWT_ALG_RS256: ok = (id == EVP_PKEY_RSA); break;
    case FF_JWT_ALG_ES256: ok = (id == EVP_PKEY_EC); break;
    case FF_JWT_ALG_EDDSA: ok = (id == EVP_PKEY_ED25519); break;
    default:               ok = 0; break;
    }

    if (!ok) {
        EVP_PKEY_free(pkey);
        return "key_file type does not match alg "
               "(RS256→RSA, ES256→EC P-256, EdDSA→Ed25519)";
    }

    cln = ngx_pool_cleanup_add(cf->pool, 0);
    if (cln == NULL) {
        EVP_PKEY_free(pkey);
        return NGX_CONF_ERROR;
    }
    cln->handler = ngx_http_flyingfish_jwt_pkey_cleanup;
    cln->data = pkey;

    jlcf->keys = ngx_pcalloc(cf->pool, sizeof(ff_jwt_key_t));
    if (jlcf->keys == NULL) {
        return NGX_CONF_ERROR;
    }

    jlcf->keys[0].pkey = pkey;
    jlcf->keys[0].kid = (kid->len != 0) ? (const char *) kid->data : NULL;
    jlcf->keys[0].kid_len = kid->len;
    jlcf->keys_count = 1;

    return NGX_CONF_OK;
}


static void
ngx_http_flyingfish_jwt_pkey_cleanup(void *data)
{
    EVP_PKEY_free((EVP_PKEY *) data);
}
