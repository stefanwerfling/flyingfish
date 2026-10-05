/*
 * Sim-only LD_PRELOAD shim for the router-sim netns harness (Pi-router epic).
 *
 * dnsmasq drops privileges at startup by calling setgroups()/initgroups(). Inside the
 * harness's rootless user namespace the kernel forces setgroups=deny (an unprivileged
 * process must write "deny" before it may write a gid_map), so those calls fail with
 * EPERM and dnsmasq aborts. This shim neutralises them to no-ops so real dnsmasq can
 * run unprivileged. It is loaded ONLY for dnsmasq inside the sim; the production
 * NET_ADMIN container runs dnsmasq as root where these calls succeed normally.
 *
 * Built at runtime by lib.sh:  cc -shared -fPIC -o nosetgroups.so setgroups-shim.c
 */
#include <sys/types.h>

int setgroups(size_t size, const gid_t *list) {
    (void) size;
    (void) list;
    return 0;
}

int initgroups(const char *user, gid_t group) {
    (void) user;
    (void) group;
    return 0;
}
