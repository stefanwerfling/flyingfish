/*
 * ngx_ff_jwt — the FlyingFish JWT verification core (nginx-native epic, Phase F).
 *
 * Deliberately nginx-free (plain unsigned char / size_t + OpenSSL only) so it can be
 * unit-tested standalone against an independent JWT implementation. The nginx module
 * (ngx_http_flyingfish_jwt_module) is a thin adapter: ngx_str_t → raw buffers, the
 * cached ngx_time() → the caller-supplied `now`.
 *
 * F.3 scope: HS256 (HMAC-SHA256) signature verification + exp/nbf checks + algorithm
 * pinning (the token's alg header MUST equal the configured algorithm; alg:"none" is
 * always rejected). Asymmetric algorithms (RS/ES/EdDSA) and iss/aud/required-claim
 * checks follow in F.4/F.5. Everything fails closed.
 */

#ifndef _NGX_FF_JWT_H_INCLUDED_
#define _NGX_FF_JWT_H_INCLUDED_


#include <stddef.h>


typedef enum {
    FF_JWT_OK = 0,
    FF_JWT_MALFORMED,        /* not a well-formed JWS compact token / bad base64url */
    FF_JWT_ALG_MISMATCH,     /* token alg != pinned alg, or alg:"none" */
    FF_JWT_BAD_SIGNATURE,    /* signature did not verify */
    FF_JWT_EXPIRED,          /* exp passed (or exp missing — exp is required) */
    FF_JWT_NOT_YET_VALID,    /* nbf in the future */
    FF_JWT_INTERNAL          /* crypto/allocation failure */
} ff_jwt_result_t;


typedef enum {
    FF_JWT_ALG_HS256 = 1
    /* HS384/HS512, RS256/ES256/EdDSA added in F.4 */
} ff_jwt_alg_t;


typedef struct {
    ff_jwt_alg_t          expected_alg;  /* pinned; the token's alg must equal this */
    const unsigned char  *key;           /* HMAC secret (HS*) */
    size_t                key_len;
    long long             now;           /* current unix time (caller-supplied → testable) */
    long                  leeway;        /* clock-skew tolerance in seconds (>= 0) */
} ff_jwt_params_t;


/*
 * Verify a compact-serialisation JWT. Returns FF_JWT_OK only when the signature is
 * valid under the pinned algorithm AND the time claims pass; any other outcome is a
 * specific deny reason. Never allocates on the heap (fixed internal scratch); a token
 * whose decoded header/payload exceeds the scratch is treated as FF_JWT_MALFORMED.
 */
ff_jwt_result_t ff_jwt_verify(const unsigned char *token, size_t token_len,
                              const ff_jwt_params_t *p);


/* Human-readable name for a result, for logging. */
const char *ff_jwt_strerror(ff_jwt_result_t r);


#endif /* _NGX_FF_JWT_H_INCLUDED_ */
