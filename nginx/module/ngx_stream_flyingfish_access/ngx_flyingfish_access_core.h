/*
 * ngx_flyingfish_access_core — the shared, module-agnostic client for the FlyingFish
 * nginx control unix socket (nginx-native epic, Phase C). Both the stream (L4) and the
 * later http (L7) access modules use this to make ONE non-blocking GET to the control
 * socket and get back the HTTP status code, from which the module decides allow/deny.
 *
 * It owns a peer connection + connect/read/write event handlers + a single timeout
 * (fail-closed: on connect/send/read error or timeout the caller's handler is invoked
 * with status 0, which every caller treats as deny). The caller pre-fills the context
 * (request buffer, timeout, done-handler + opaque data, log, pool) and calls
 * ngx_ff_access_start(); the done-handler fires exactly once.
 */

#ifndef _NGX_FLYINGFISH_ACCESS_CORE_H_INCLUDED_
#define _NGX_FLYINGFISH_ACCESS_CORE_H_INCLUDED_


#include <ngx_config.h>
#include <ngx_core.h>
#include <ngx_event.h>
#include <ngx_event_connect.h>


/* Invoked exactly once when the control socket's HTTP status line has been read
 * (status = the 3-digit code) or on any error/timeout (status = 0). */
typedef void (*ngx_ff_access_done_pt)(void *data, ngx_int_t status);


typedef struct {
    /* --- filled by the caller before ngx_ff_access_start --- */
    ngx_buf_t              *request;   /* the full HTTP request to send */
    ngx_msec_t              timeout;   /* connect + send + read deadline (ms) */
    ngx_ff_access_done_pt   handler;   /* called once with the status (0 = error) */
    void                   *data;      /* opaque, passed back to handler */
    ngx_log_t              *log;
    ngx_pool_t             *pool;

    /* --- owned by the core --- */
    ngx_peer_connection_t   peer;
    ngx_buf_t              *response;  /* accumulates the status-line region */
    unsigned                done:1;    /* handler already fired (re-entrancy guard) */
} ngx_ff_access_ctx_t;


/*
 * Start the non-blocking check. On success returns NGX_OK and the caller's handler
 * will fire later (from the event loop). On an immediate setup failure returns
 * NGX_ERROR and the handler is NOT called (the caller should fail closed itself).
 */
ngx_int_t ngx_ff_access_start(ngx_ff_access_ctx_t *ctx, ngx_str_t *socket_path);


#endif /* _NGX_FLYINGFISH_ACCESS_CORE_H_INCLUDED_ */
