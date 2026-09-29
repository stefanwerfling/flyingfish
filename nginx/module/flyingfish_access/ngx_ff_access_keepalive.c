/*
 * ngx_ff_access_keepalive — see the header. Per-worker idle-connection pool for the
 * control unix socket, modelled on ngx_http_upstream_keepalive_module.
 */

#include "ngx_ff_access_keepalive.h"

#include <sys/socket.h>


#define NGX_FF_KEEPALIVE_MAX       16
#define NGX_FF_KEEPALIVE_TIMEOUT   4000   /* ms; kept below Node's 5s default
                                           * server keepAliveTimeout so we reap the
                                           * connection before the server does */


typedef struct {
    ngx_queue_t         queue;
    ngx_connection_t   *connection;
    size_t              path_len;
    u_char              path[108];        /* sizeof(struct sockaddr_un.sun_path) */
} ngx_ff_keepalive_item_t;


/* per-worker state (single-threaded event loop → no locking) */
static ngx_uint_t   ngx_ff_keepalive_inited;
static ngx_queue_t  ngx_ff_keepalive_cache;   /* parked, idle connections */
static ngx_queue_t  ngx_ff_keepalive_free;    /* spare item structs */
static ngx_pool_t  *ngx_ff_keepalive_pool;    /* long-lived storage for the items */


static ngx_int_t ngx_ff_keepalive_init(void);
static void ngx_ff_keepalive_close_handler(ngx_event_t *ev);
static void ngx_ff_keepalive_dummy_handler(ngx_event_t *ev);
static void ngx_ff_keepalive_remove(ngx_connection_t *c);


static ngx_int_t
ngx_ff_keepalive_init(void)
{
    ngx_uint_t                i;
    ngx_ff_keepalive_item_t  *items;

    if (ngx_ff_keepalive_inited) {
        return NGX_OK;
    }

    /*
     * A standalone pool (not a child of any request/cycle pool): parked connections
     * and their item structs must outlive the request pools they were opened from.
     * The worker process frees its whole address space on exit and nginx closes all
     * connections at shutdown, so nothing here leaks across the process lifetime.
     */
    ngx_ff_keepalive_pool = ngx_create_pool(1024, ngx_cycle->log);
    if (ngx_ff_keepalive_pool == NULL) {
        return NGX_ERROR;
    }

    ngx_queue_init(&ngx_ff_keepalive_cache);
    ngx_queue_init(&ngx_ff_keepalive_free);

    items = ngx_pcalloc(ngx_ff_keepalive_pool,
                        sizeof(ngx_ff_keepalive_item_t) * NGX_FF_KEEPALIVE_MAX);
    if (items == NULL) {
        ngx_destroy_pool(ngx_ff_keepalive_pool);
        ngx_ff_keepalive_pool = NULL;
        return NGX_ERROR;
    }

    for (i = 0; i < NGX_FF_KEEPALIVE_MAX; i++) {
        ngx_queue_insert_head(&ngx_ff_keepalive_free, &items[i].queue);
    }

    ngx_ff_keepalive_inited = 1;

    return NGX_OK;
}


ngx_connection_t *
ngx_ff_keepalive_acquire(ngx_str_t *socket_path)
{
    ngx_queue_t              *q;
    ngx_connection_t         *c;
    ngx_ff_keepalive_item_t  *item;

    if (!ngx_ff_keepalive_inited) {
        return NULL;
    }

    for (q = ngx_queue_head(&ngx_ff_keepalive_cache);
         q != ngx_queue_sentinel(&ngx_ff_keepalive_cache);
         q = ngx_queue_next(q))
    {
        item = ngx_queue_data(q, ngx_ff_keepalive_item_t, queue);

        if (item->path_len != socket_path->len
            || ngx_memcmp(item->path, socket_path->data, socket_path->len) != 0)
        {
            continue;
        }

        c = item->connection;

        ngx_queue_remove(q);
        ngx_queue_insert_head(&ngx_ff_keepalive_free, q);

        if (c->read->timer_set) {
            ngx_del_timer(c->read);
        }

        c->idle = 0;

        return c;
    }

    return NULL;
}


ngx_int_t
ngx_ff_keepalive_release(ngx_connection_t *c, ngx_str_t *socket_path)
{
    ngx_queue_t              *q;
    ngx_event_t              *rev, *wev;
    ngx_ff_keepalive_item_t  *item;

    if (ngx_ff_keepalive_init() != NGX_OK) {
        return NGX_DECLINED;
    }

    if (socket_path->len == 0 || socket_path->len > sizeof(item->path)) {
        return NGX_DECLINED;
    }

    /* only a healthy connection is reusable */
    if (c->error || c->close || c->read->error || c->write->error) {
        return NGX_DECLINED;
    }

    if (ngx_queue_empty(&ngx_ff_keepalive_free)) {
        /* pool full — caller closes */
        return NGX_DECLINED;
    }

    rev = c->read;
    wev = c->write;

    q = ngx_queue_head(&ngx_ff_keepalive_free);
    ngx_queue_remove(q);
    item = ngx_queue_data(q, ngx_ff_keepalive_item_t, queue);

    item->connection = c;
    item->path_len = socket_path->len;
    ngx_memcpy(item->path, socket_path->data, socket_path->len);

    c->data = item;
    c->idle = 1;
    c->log = ngx_cycle->log;
    c->read->log = ngx_cycle->log;
    c->write->log = ngx_cycle->log;

    rev->handler = ngx_ff_keepalive_close_handler;
    wev->handler = ngx_ff_keepalive_dummy_handler;

    if (ngx_handle_read_event(rev, 0) != NGX_OK) {
        /* could not arm the idle read watch — hand the item back, caller closes c */
        ngx_queue_insert_head(&ngx_ff_keepalive_free, q);
        return NGX_DECLINED;
    }

    ngx_queue_insert_head(&ngx_ff_keepalive_cache, q);
    ngx_add_timer(rev, NGX_FF_KEEPALIVE_TIMEOUT);

    return NGX_OK;
}


/*
 * Idle read handler: fires when the parked connection becomes readable (the peer sent
 * data or, far more commonly here, closed it) or when the idle timer expires. Either
 * way the connection is no longer a clean, reusable boundary — reap it.
 */
static void
ngx_ff_keepalive_close_handler(ngx_event_t *ev)
{
    u_char             buf[1];
    ssize_t            n;
    ngx_connection_t  *c;

    c = ev->data;

    if (c->close || ev->timedout) {
        goto close;
    }

    /*
     * MSG_PEEK without consuming: a healthy idle connection has nothing pending and
     * returns EAGAIN — re-arm and keep it. EOF (0), readable bytes (unexpected on an
     * idle control connection) or any error means it is no longer clean → reap.
     */
    n = recv(c->fd, buf, 1, MSG_PEEK);

    if (n == -1 && ngx_socket_errno == NGX_EAGAIN) {
        ev->ready = 0;

        if (ngx_handle_read_event(ev, 0) != NGX_OK) {
            goto close;
        }

        return;
    }

close:

    ngx_ff_keepalive_remove(c);
}


static void
ngx_ff_keepalive_dummy_handler(ngx_event_t *ev)
{
}


static void
ngx_ff_keepalive_remove(ngx_connection_t *c)
{
    ngx_ff_keepalive_item_t  *item;

    item = c->data;

    if (c->read->timer_set) {
        ngx_del_timer(c->read);
    }

    ngx_queue_remove(&item->queue);
    ngx_queue_insert_head(&ngx_ff_keepalive_free, &item->queue);

    ngx_close_connection(c);
}
