/*
 * ngx_flyingfish_access_core — see the header. Non-blocking unix-socket HTTP client
 * with keepalive: borrow an idle connection (or connect), send the caller's HTTP/1.1
 * request, read the FULL response (status line + headers + Content-Length body), then
 * either park the connection for reuse or close it — firing the caller's done-handler
 * once with the status (or 0 on any error/timeout, fail-closed). A reused connection
 * the server has already closed is retried once on a fresh connection.
 */

#include "ngx_flyingfish_access_core.h"
#include "ngx_ff_access_keepalive.h"

#include <sys/un.h>


/* Big enough to hold a full control response (status line + the handful of headers
 * Express/Node emit + the empty body) so keepalive can drain to a clean boundary; a
 * response that overflows it is simply not kept alive (the status is still delivered). */
#define NGX_FF_ACCESS_RESP_SIZE  2048


/* ngx_ff_access_ctx_t.parse_state */
enum {
    NGX_FF_PARSE_STATUS = 0,
    NGX_FF_PARSE_HEADERS,
    NGX_FF_PARSE_BODY,
    NGX_FF_PARSE_DONE
};


static ngx_int_t ngx_ff_access_connect(ngx_ff_access_ctx_t *ctx);
static void ngx_ff_access_attach(ngx_ff_access_ctx_t *ctx, ngx_connection_t *c);
static ngx_int_t ngx_ff_access_retry(ngx_ff_access_ctx_t *ctx);
static void ngx_ff_access_write_handler(ngx_event_t *wev);
static void ngx_ff_access_read_handler(ngx_event_t *rev);
static ngx_int_t ngx_ff_access_parse(ngx_ff_access_ctx_t *ctx);
static u_char *ngx_ff_find_crlf(u_char *p, u_char *last);
static void ngx_ff_access_finish(ngx_ff_access_ctx_t *ctx, ngx_int_t status);


ngx_int_t
ngx_ff_access_start(ngx_ff_access_ctx_t *ctx, ngx_str_t *socket_path)
{
    ngx_connection_t  *c;

    if (socket_path->len == 0
        || socket_path->len >= sizeof(((struct sockaddr_un *) 0)->sun_path))
    {
        return NGX_ERROR;
    }

    ctx->socket_path = socket_path;
    ctx->content_length = -1;
    ctx->body_read = 0;
    ctx->parse_state = NGX_FF_PARSE_STATUS;
    ctx->status = 0;

    ctx->response = ngx_create_temp_buf(ctx->pool, NGX_FF_ACCESS_RESP_SIZE);
    if (ctx->response == NULL) {
        return NGX_ERROR;
    }

    /*
     * Fast path: reuse an idle connection previously parked for this socket. It may
     * have been closed by the server since — that surfaces on the first send/recv and
     * the check is retried once on a fresh connection (see ngx_ff_access_retry).
     */
    c = ngx_ff_keepalive_acquire(socket_path);

    if (c != NULL) {
        ctx->reused = 1;
        ctx->peer.connection = c;
        ngx_ff_access_attach(ctx, c);

        ngx_add_timer(c->write, ctx->timeout);

        /*
         * Post the write rather than driving it inline: on the reuse path the socket
         * is already writable, so running the send here could finish() → the caller's
         * done handler → the phase engine re-entrantly inside the access handler that
         * called us and hasn't returned yet. Post it so it runs after this unwinds.
         */
        ngx_post_event(c->write, &ngx_posted_events);

        return NGX_OK;
    }

    return ngx_ff_access_connect(ctx);
}


/*
 * Open a fresh non-blocking connection to the control socket and wire the request onto
 * it. Used for the first attempt when the keepalive pool was empty and for the
 * retry-after-a-dead-reuse path.
 */
static ngx_int_t
ngx_ff_access_connect(ngx_ff_access_ctx_t *ctx)
{
    size_t                sun_len;
    ngx_int_t             rc;
    ngx_connection_t     *c;
    struct sockaddr_un   *sun;
    ngx_str_t            *socket_path = ctx->socket_path;

    sun = ngx_pcalloc(ctx->pool, sizeof(struct sockaddr_un));
    if (sun == NULL) {
        return NGX_ERROR;
    }

    sun->sun_family = AF_UNIX;
    ngx_memcpy(sun->sun_path, socket_path->data, socket_path->len);
    sun_len = offsetof(struct sockaddr_un, sun_path) + socket_path->len + 1;

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
            ctx->peer.connection = NULL;
        }
        return NGX_ERROR;
    }

    /* rc == NGX_OK (connected) or NGX_AGAIN (in progress) */
    c = ctx->peer.connection;
    ngx_ff_access_attach(ctx, c);

    ngx_add_timer(c->write, ctx->timeout);

    /*
     * Never drive the write handler synchronously from here: on the NGX_OK
     * (already-connected) path that would run the send — and possibly finish() →
     * the caller's done handler → the phase engine — re-entrantly inside the access
     * handler that called us and hasn't returned yet. Post the write event so it runs
     * from the event loop after this stack unwinds; the NGX_AGAIN path is naturally
     * driven by the connect-completion write event.
     */
    if (rc == NGX_OK) {
        ngx_post_event(c->write, &ngx_posted_events);
    }

    return NGX_OK;
}


static void
ngx_ff_access_attach(ngx_ff_access_ctx_t *ctx, ngx_connection_t *c)
{
    c->data = ctx;
    c->write->handler = ngx_ff_access_write_handler;
    c->read->handler = ngx_ff_access_read_handler;
}


/*
 * Retry the check once on a fresh connection, called when a reused (keepalive)
 * connection turned out to be dead before the server produced any response. Safe
 * because the server never processed the request (no status line was read). Returns
 * NGX_OK when a fresh attempt is under way, NGX_ERROR when it could not be started.
 */
static ngx_int_t
ngx_ff_access_retry(ngx_ff_access_ctx_t *ctx)
{
    ngx_connection_t  *c = ctx->peer.connection;

    ctx->retried = 1;
    ctx->reused = 0;

    if (c != NULL) {
        if (c->read->timer_set) {
            ngx_del_timer(c->read);
        }
        if (c->write->timer_set) {
            ngx_del_timer(c->write);
        }
        ngx_close_connection(c);
        ctx->peer.connection = NULL;
    }

    /* rewind the request and the response parser for a clean re-send */
    ctx->request->pos = ctx->request->start;

    ctx->response->pos = ctx->response->start;
    ctx->response->last = ctx->response->start;
    ctx->content_length = -1;
    ctx->body_read = 0;
    ctx->parse_state = NGX_FF_PARSE_STATUS;
    ctx->status = 0;
    ctx->keepalive = 0;

    return ngx_ff_access_connect(ctx);
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

        /* n == NGX_ERROR — a dead reused connection is retried once on a fresh one */
        if (ctx->reused && !ctx->retried) {
            if (ngx_ff_access_retry(ctx) != NGX_OK) {
                ngx_ff_access_finish(ctx, 0);
            }
            return;
        }

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
            /*
             * Response larger than the buffer. We may already have a usable status
             * (parse sets it as soon as the status line is in); deliver that and close
             * — an over-long response is not a clean keepalive boundary.
             */
            ctx->keepalive = 0;
            ngx_ff_access_finish(ctx, ctx->status);
            return;
        }

        n = c->recv(c, b->last, b->end - b->last);

        if (n > 0) {
            b->last += n;

            rc = ngx_ff_access_parse(ctx);
            if (rc == NGX_OK) {
                ngx_ff_access_finish(ctx, ctx->status);
                return;
            }

            /* rc == NGX_AGAIN — need more bytes */
            continue;
        }

        if (n == NGX_AGAIN) {
            if (ngx_handle_read_event(rev, 0) != NGX_OK) {
                ngx_ff_access_finish(ctx, 0);
            }
            return;
        }

        /*
         * n == 0 (peer closed) or NGX_ERROR. If this is a reused connection that the
         * server closed before answering (no status read yet), retry once on a fresh
         * connection — the request was never processed, so the retry cannot double it.
         */
        if (ctx->reused && !ctx->retried && ctx->status == 0) {
            if (ngx_ff_access_retry(ctx) != NGX_OK) {
                ngx_ff_access_finish(ctx, 0);
            }
            return;
        }

        ngx_ff_access_finish(ctx, ctx->status);
        return;
    }
}


/*
 * Parse the accumulated response. Sets ctx->status as soon as the status line is in,
 * and ctx->keepalive when the full response (status + headers + Content-Length body)
 * has arrived on a connection that is a clean, reusable keep-alive boundary. Returns
 * NGX_OK when the response is complete (ctx->status / ctx->keepalive are final), or
 * NGX_AGAIN when more bytes are needed. A malformed status line completes with
 * status 0 and keepalive off (the caller fails closed and closes the connection).
 */
static ngx_int_t
ngx_ff_access_parse(ngx_ff_access_ctx_t *ctx)
{
    u_char     *p, *last, *sol_end, *headers_end, *line, *body;
    u_char     *name_end;
    ngx_int_t   http_minor, conn_close, conn_keepalive, chunked;
    ngx_buf_t  *b;

    b = ctx->response;
    last = b->last;

    /* --- status line --- */
    sol_end = ngx_ff_find_crlf(b->start, last);
    if (sol_end == NULL) {
        return NGX_AGAIN;
    }

    /* "HTTP/1.x <code> ..." */
    p = b->start;
    while (p < sol_end && *p != ' ') {
        p++;
    }

    /* HTTP minor version: the digit after "HTTP/1." (default 0 if unrecognised) */
    http_minor = 0;
    if ((size_t) (p - b->start) >= sizeof("HTTP/1.") - 1) {
        http_minor = b->start[sizeof("HTTP/1.") - 1] - '0';
        if (http_minor < 0 || http_minor > 9) {
            http_minor = 0;
        }
    }

    if (p == sol_end || sol_end - p < 4) {
        /* no space, or no room for " ddd" — malformed */
        ctx->status = 0;
        ctx->keepalive = 0;
        ctx->parse_state = NGX_FF_PARSE_DONE;
        return NGX_OK;
    }

    p++; /* first char of the status code */

    if (p[0] < '0' || p[0] > '9'
        || p[1] < '0' || p[1] > '9'
        || p[2] < '0' || p[2] > '9')
    {
        ctx->status = 0;
        ctx->keepalive = 0;
        ctx->parse_state = NGX_FF_PARSE_DONE;
        return NGX_OK;
    }

    ctx->status = (p[0] - '0') * 100 + (p[1] - '0') * 10 + (p[2] - '0');
    ctx->parse_state = NGX_FF_PARSE_HEADERS;

    /* --- headers --- */
    headers_end = NULL;
    for (p = sol_end; last - p >= 4; p++) {
        if (p[0] == '\r' && p[1] == '\n' && p[2] == '\r' && p[3] == '\n') {
            headers_end = p + 2;   /* points at the blank line's CRLF */
            break;
        }
    }

    if (headers_end == NULL) {
        return NGX_AGAIN;
    }

    conn_close = 0;
    conn_keepalive = 0;
    chunked = 0;

    line = sol_end + 2;   /* first header line */

    while (line < headers_end) {
        u_char  *eol = ngx_ff_find_crlf(line, headers_end);

        if (eol == NULL) {
            break;
        }

        name_end = line;
        while (name_end < eol && *name_end != ':') {
            name_end++;
        }

        if (name_end < eol) {
            size_t   nlen = name_end - line;
            u_char  *v = name_end + 1;

            while (v < eol && (*v == ' ' || *v == '\t')) {
                v++;
            }

            if (nlen == sizeof("Content-Length") - 1
                && ngx_strncasecmp(line, (u_char *) "Content-Length", nlen) == 0)
            {
                off_t  cl = 0;

                for (; v < eol && *v >= '0' && *v <= '9'; v++) {
                    cl = cl * 10 + (*v - '0');
                }

                ctx->content_length = cl;

            } else if (nlen == sizeof("Transfer-Encoding") - 1
                       && ngx_strncasecmp(line, (u_char *) "Transfer-Encoding",
                                          nlen) == 0)
            {
                if ((size_t) (eol - v) >= sizeof("chunked") - 1
                    && ngx_strncasecmp(v, (u_char *) "chunked",
                                       sizeof("chunked") - 1) == 0)
                {
                    chunked = 1;
                }

            } else if (nlen == sizeof("Connection") - 1
                       && ngx_strncasecmp(line, (u_char *) "Connection", nlen) == 0)
            {
                if ((size_t) (eol - v) >= sizeof("close") - 1
                    && ngx_strncasecmp(v, (u_char *) "close",
                                       sizeof("close") - 1) == 0)
                {
                    conn_close = 1;

                } else if ((size_t) (eol - v) >= sizeof("keep-alive") - 1
                           && ngx_strncasecmp(v, (u_char *) "keep-alive",
                                              sizeof("keep-alive") - 1) == 0)
                {
                    conn_keepalive = 1;
                }
            }
        }

        line = eol + 2;
    }

    /*
     * Reusable only if the message length is unambiguous (a Content-Length, not
     * chunked) and the connection is not being closed: HTTP/1.1 keeps alive unless
     * told to close; HTTP/1.0 keeps alive only when it explicitly says keep-alive.
     */
    if (chunked || ctx->content_length < 0
        || (http_minor >= 1 ? conn_close : !conn_keepalive))
    {
        ctx->keepalive = 0;
        ctx->parse_state = NGX_FF_PARSE_DONE;
        return NGX_OK;
    }

    /* --- body: drain exactly Content-Length bytes so the connection is reusable --- */
    body = headers_end + 2;
    ctx->body_read = last - body;
    ctx->parse_state = NGX_FF_PARSE_BODY;

    if (ctx->body_read >= ctx->content_length) {
        /* exactly the declared body → clean boundary; any surplus means the stream is
         * desynced (unexpected trailing bytes) → deliver the status but don't reuse */
        ctx->keepalive = (ctx->body_read == ctx->content_length) ? 1 : 0;
        ctx->parse_state = NGX_FF_PARSE_DONE;
        return NGX_OK;
    }

    /* body won't fit in the buffer — deliver the status but don't keep the connection */
    if (body + ctx->content_length > b->end) {
        ctx->keepalive = 0;
        ctx->parse_state = NGX_FF_PARSE_DONE;
        return NGX_OK;
    }

    return NGX_AGAIN;
}


static u_char *
ngx_ff_find_crlf(u_char *p, u_char *last)
{
    while (last - p >= 2) {
        if (p[0] == '\r' && p[1] == '\n') {
            return p;
        }
        p++;
    }

    return NULL;
}


static void
ngx_ff_access_finish(ngx_ff_access_ctx_t *ctx, ngx_int_t status)
{
    ngx_connection_t  *c;

    if (ctx->done) {
        return;
    }

    ctx->done = 1;

    c = ctx->peer.connection;

    if (c != NULL) {
        /*
         * On a clean, fully-drained keep-alive response, park the connection for reuse
         * instead of closing it. Clear our own timers first — the keepalive pool arms
         * its own idle read watch and owns the connection's event wiring from here on.
         */
        if (ctx->keepalive) {
            if (c->read->timer_set) {
                ngx_del_timer(c->read);
            }
            if (c->write->timer_set) {
                ngx_del_timer(c->write);
            }

            if (ngx_ff_keepalive_release(c, ctx->socket_path) == NGX_OK) {
                ctx->peer.connection = NULL;   /* parked — must not close it */
            }
        }

        if (ctx->peer.connection != NULL) {
            ngx_close_connection(c);
            ctx->peer.connection = NULL;
        }
    }

    ctx->handler(ctx->data, status);
}
