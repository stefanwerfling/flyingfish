/*
 * ngx_ff_access_keepalive — a tiny per-worker pool of idle keepalive connections to
 * the FlyingFish control unix socket (nginx-native epic, Batch 6). The access core
 * borrows a parked connection instead of connecting fresh on every check, and returns
 * it here once the response has been fully drained so the next check can reuse it.
 *
 * Modelled on nginx's own ngx_http_upstream_keepalive_module: a bounded free list,
 * an idle read handler that reaps the connection when the peer closes it (or the idle
 * timeout fires), and no locking (nginx workers are single-threaded event loops).
 *
 * The control socket is effectively a single fixed path, but the pool is keyed by the
 * socket path string anyway so a connection is only ever handed back for the exact
 * endpoint it was opened to.
 */

#ifndef _NGX_FF_ACCESS_KEEPALIVE_H_INCLUDED_
#define _NGX_FF_ACCESS_KEEPALIVE_H_INCLUDED_


#include <ngx_config.h>
#include <ngx_core.h>
#include <ngx_event.h>


/*
 * Borrow an idle connection previously parked for this socket path, or NULL if the
 * pool has none. The returned connection has its idle timer cleared and c->idle reset;
 * the caller owns it again and must either release() it back or close it. The caller
 * must be prepared for the connection to be stale (the peer may have closed it since
 * it was parked) — the first send/recv discovers that and the caller retries fresh.
 */
ngx_connection_t *ngx_ff_keepalive_acquire(ngx_str_t *socket_path);


/*
 * Park a drained, reusable connection for a later acquire(). Returns NGX_OK when the
 * connection was taken into the pool (the caller must then forget it), or NGX_DECLINED
 * when the pool is full or setup failed (the caller must close the connection itself).
 */
ngx_int_t ngx_ff_keepalive_release(ngx_connection_t *c, ngx_str_t *socket_path);


#endif /* _NGX_FF_ACCESS_KEEPALIVE_H_INCLUDED_ */
