/*
 * ngx_flyingfish_access_core — see the header. Non-blocking unix-socket HTTP client:
 * connect → send the caller's request → read the HTTP status line → fire the caller's
 * done-handler once with the status (or 0 on any error/timeout, fail-closed).
 */

#include "ngx_flyingfish_access_core.h"

#include <sys/un.h>


#define NGX_FF_ACCESS_RESP_SIZE  512


static void ngx_ff_access_write_handler(ngx_event_t *wev);
static void ngx_ff_access_read_handler(ngx_event_t *rev);
static ngx_int_t ngx_ff_access_parse_status(ngx_ff_access_ctx_t *ctx);
static void ngx_ff_access_finish(ngx_ff_access_ctx_t *ctx, ngx_int_t status);


ngx_int_t
ngx_ff_access_start(ngx_ff_access_ctx_t *ctx, ngx_str_t *socket_path)
{
    size_t                sun_len;
    ngx_int_t             rc;
    ngx_connection_t     *c;
    struct sockaddr_un   *sun;

    if (socket_path->len == 0
        || socket_path->len >= sizeof(sun->sun_path))
    {
        return NGX_ERROR;
    }

    sun = ngx_pcalloc(ctx->pool, sizeof(struct sockaddr_un));
    if (sun == NULL) {
        return NGX_ERROR;
    }

    sun->sun_family = AF_UNIX;
    ngx_memcpy(sun->sun_path, socket_path->data, socket_path->len);
    sun_len = offsetof(struct sockaddr_un, sun_path) + socket_path->len + 1;

    ctx->response = ngx_create_temp_buf(ctx->pool, NGX_FF_ACCESS_RESP_SIZE);
    if (ctx->response == NULL) {
        return NGX_ERROR;
    }

    ngx_memzero(&ctx->peer, sizeof(ngx_peer_connection_t));
    ctx->peer.sockaddr = (struct sockaddr *) sun;
    ctx->peer.socklen = (socklen_t) sun_len;
    ctx->peer.name = socket_path;
    ctx->peer.get = ngx_event_get_peer;
    ctx->peer.log = ctx->log;
    ctx->peer.log_error = NGX_ERROR_ERR;

    rc = ngx_event_connect_peer(&ctx->peer);

    if (rc == NGX_ERROR || rc == NGX_BUSY || rc == NGX_DECLINED) {
        if (ctx->peer.connection) {
            ngx_close_connection(ctx->peer.connection);
        }
        return NGX_ERROR;
    }

    /* rc == NGX_OK (connected) or NGX_AGAIN (in progress) */
    c = ctx->peer.connection;
    c->data = ctx;
    c->write->handler = ngx_ff_access_write_handler;
    c->read->handler = ngx_ff_access_read_handler;

    ngx_add_timer(c->write, ctx->timeout);

    /*
     * Never drive the write handler synchronously from here: on the NGX_OK
     * (already-connected) path that would run the send — and possibly finish() →
     * the caller's done handler → ngx_stream_core_run_phases — re-entrantly inside
     * the access handler that called us and hasn't returned yet. Post the write
     * event so it runs from the event loop after this stack unwinds; the NGX_AGAIN
     * path is naturally driven by the connect-completion write event.
     */
    if (rc == NGX_OK) {
        ngx_post_event(c->write, &ngx_posted_events);
    }

    return NGX_OK;
}


static void
ngx_ff_access_write_handler(ngx_event_t *wev)
{
    ssize_t               n;
    ngx_buf_t            *b;
    ngx_connection_t     *c;
    ngx_ff_access_ctx_t  *ctx;

    c = wev->data;
    ctx = c->data;

    if (wev->timedout) {
        ngx_log_error(NGX_LOG_ERR, ctx->log, NGX_ETIMEDOUT,
                      "flyingfish_access: control socket send timed out");
        ngx_ff_access_finish(ctx, 0);
        return;
    }

    b = ctx->request;

    while (b->pos < b->last) {
        n = c->send(c, b->pos, b->last - b->pos);

        if (n > 0) {
            b->pos += n;
            continue;
        }

        if (n == NGX_AGAIN) {
            if (ngx_handle_write_event(wev, 0) != NGX_OK) {
                ngx_ff_access_finish(ctx, 0);
            }
            return;
        }

        /* n == NGX_ERROR */
        ngx_ff_access_finish(ctx, 0);
        return;
    }

    /*
     * Request fully sent — arm the read side and return. The event loop drives the
     * read handler when the response arrives; we deliberately do NOT call it inline
     * (it may finish() → close the connection, and we must not touch it afterwards).
     */
    if (wev->timer_set) {
        ngx_del_timer(wev);
    }

    ngx_add_timer(c->read, ctx->timeout);

    if (ngx_handle_read_event(c->read, 0) != NGX_OK) {
        ngx_ff_access_finish(ctx, 0);
        return;
    }

    if (c->read->ready) {
        ngx_ff_access_read_handler(c->read);
    }
}


static void
ngx_ff_access_read_handler(ngx_event_t *rev)
{
    ssize_t               n;
    ngx_buf_t            *b;
    ngx_int_t             rc;
    ngx_connection_t     *c;
    ngx_ff_access_ctx_t  *ctx;

    c = rev->data;
    ctx = c->data;

    if (rev->timedout) {
        ngx_log_error(NGX_LOG_ERR, ctx->log, NGX_ETIMEDOUT,
                      "flyingfish_access: control socket read timed out");
        ngx_ff_access_finish(ctx, 0);
        return;
    }

    b = ctx->response;

    for ( ;; ) {
        if (b->last == b->end) {
            /* status line longer than the buffer — treat as malformed */
            ngx_ff_access_finish(ctx, 0);
            return;
        }

        n = c->recv(c, b->last, b->end - b->last);

        if (n > 0) {
            b->last += n;

            rc = ngx_ff_access_parse_status(ctx);
            if (rc != NGX_AGAIN) {
                /* rc is the status code (or 0 if unparsable so far handled below) */
                ngx_ff_access_finish(ctx, rc);
                return;
            }

            continue;
        }

        if (n == NGX_AGAIN) {
            if (ngx_handle_read_event(rev, 0) != NGX_OK) {
                ngx_ff_access_finish(ctx, 0);
            }
            return;
        }

        /* n == 0 (peer closed before a full status line) or NGX_ERROR */
        ngx_ff_access_finish(ctx, 0);
        return;
    }
}


/*
 * Parse the HTTP status code from the accumulated response. Returns the 3-digit
 * status once the status line is available, or NGX_AGAIN if more bytes are needed.
 */
static ngx_int_t
ngx_ff_access_parse_status(ngx_ff_access_ctx_t *ctx)
{
    u_char     *p, *last;
    ngx_buf_t  *b;

    b = ctx->response;
    p = b->start;
    last = b->last;

    /* "HTTP/1.x <code> ..." — skip to the first space */
    while (p < last && *p != ' ') {
        p++;
    }

    if (p == last) {
        return NGX_AGAIN;
    }

    p++; /* first char of the status code */

    if (last - p < 3) {
        return NGX_AGAIN;
    }

    if (p[0] < '0' || p[0] > '9'
        || p[1] < '0' || p[1] > '9'
        || p[2] < '0' || p[2] > '9')
    {
        /* malformed status line */
        return 0;
    }

    return (p[0] - '0') * 100 + (p[1] - '0') * 10 + (p[2] - '0');
}


static void
ngx_ff_access_finish(ngx_ff_access_ctx_t *ctx, ngx_int_t status)
{
    if (ctx->done) {
        return;
    }

    ctx->done = 1;

    if (ctx->peer.connection) {
        ngx_close_connection(ctx->peer.connection);
        ctx->peer.connection = NULL;
    }

    ctx->handler(ctx->data, status);
}
