/*
 * ngx_stream_flyingfish_access_module — FlyingFish L4 (stream) access control as a
 * native nginx module (the "nginx nativ" epic, Phase C), replacing the njs
 * `mainstream.accessAddressStream` js_access handler.
 *
 * SLICE 1 (this file): the module scaffold — it compiles, statically links into the
 * nginx binary via --add-module, registers a `flyingfish_access on|off;` directive in
 * the stream `server` context, and installs a handler in the STREAM access phase that
 * reads the client address and (for now) allows the connection. This proves the whole
 * build + load + phase-wiring pipeline before the hard part.
 *
 * SLICE 2 (next): replace the stub allow with the real non-blocking check — connect to
 * the FlyingFish control unix socket, GET /njs/address_access with the
 * realip_remote_addr / remote_addr / listen_id headers, and allow on HTTP 200 / deny
 * otherwise, with an explicit connect+read timeout (fail-closed). A shared C core will
 * hold that socket/decision logic for the http module too.
 */

#include <ngx_config.h>
#include <ngx_core.h>
#include <ngx_stream.h>


typedef struct {
    ngx_flag_t  enable;
} ngx_stream_flyingfish_access_srv_conf_t;


static ngx_int_t ngx_stream_flyingfish_access_handler(ngx_stream_session_t *s);
static ngx_int_t ngx_stream_flyingfish_access_init(ngx_conf_t *cf);
static void *ngx_stream_flyingfish_access_create_srv_conf(ngx_conf_t *cf);
static char *ngx_stream_flyingfish_access_merge_srv_conf(ngx_conf_t *cf,
    void *parent, void *child);


static ngx_command_t  ngx_stream_flyingfish_access_commands[] = {

    { ngx_string("flyingfish_access"),
      NGX_STREAM_SRV_CONF|NGX_CONF_FLAG,
      ngx_conf_set_flag_slot,
      NGX_STREAM_SRV_CONF_OFFSET,
      offsetof(ngx_stream_flyingfish_access_srv_conf_t, enable),
      NULL },

      ngx_null_command
};


static ngx_stream_module_t  ngx_stream_flyingfish_access_module_ctx = {
    NULL,                                          /* preconfiguration */
    ngx_stream_flyingfish_access_init,             /* postconfiguration */

    NULL,                                          /* create main configuration */
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
    ngx_connection_t                         *c;
    ngx_stream_flyingfish_access_srv_conf_t  *ascf;

    ascf = ngx_stream_get_module_srv_conf(s,
        ngx_stream_flyingfish_access_module);

    /* not enabled for this stream server — let other access handlers run */
    if (!ascf->enable) {
        return NGX_DECLINED;
    }

    c = s->connection;

    /*
     * Slice 1 stub: prove the handler runs in the stream access phase and can read
     * the client address. Slice 2 does the real control-socket check here; until
     * then this allows the connection (the real access path still runs through njs,
     * which the config generator keeps emitting — this module is not wired into the
     * generated config yet).
     */
    ngx_log_error(NGX_LOG_INFO, c->log, 0,
                  "flyingfish_access: stub allow (client %V)", &c->addr_text);

    return NGX_OK;
}


static void *
ngx_stream_flyingfish_access_create_srv_conf(ngx_conf_t *cf)
{
    ngx_stream_flyingfish_access_srv_conf_t  *conf;

    conf = ngx_pcalloc(cf->pool, sizeof(ngx_stream_flyingfish_access_srv_conf_t));
    if (conf == NULL) {
        return NULL;
    }

    conf->enable = NGX_CONF_UNSET;

    return conf;
}


static char *
ngx_stream_flyingfish_access_merge_srv_conf(ngx_conf_t *cf, void *parent,
    void *child)
{
    ngx_stream_flyingfish_access_srv_conf_t  *prev = parent;
    ngx_stream_flyingfish_access_srv_conf_t  *conf = child;

    ngx_conf_merge_value(conf->enable, prev->enable, 0);

    return NGX_CONF_OK;
}


static ngx_int_t
ngx_stream_flyingfish_access_init(ngx_conf_t *cf)
{
    ngx_stream_handler_pt        *h;
    ngx_stream_core_main_conf_t  *cmcf;

    cmcf = ngx_stream_conf_get_module_main_conf(cf, ngx_stream_core_module);

    h = ngx_array_push(&cmcf->phases[NGX_STREAM_ACCESS_PHASE].handlers);
    if (h == NULL) {
        return NGX_ERROR;
    }

    *h = ngx_stream_flyingfish_access_handler;

    return NGX_OK;
}
