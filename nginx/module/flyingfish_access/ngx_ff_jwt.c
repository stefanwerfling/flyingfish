/*
 * ngx_ff_jwt — see the header. Standalone (nginx-free) JWT verification for the native
 * FlyingFish L7 auth (Phase F, F.3): HS256 signature + exp/nbf + algorithm pinning.
 */

#include "ngx_ff_jwt.h"

#include <string.h>

#include <openssl/opensslv.h>
#include <openssl/crypto.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#if OPENSSL_VERSION_NUMBER >= 0x30000000L
#include <openssl/params.h>
#include <openssl/core_names.h>
#endif


/* Decoded header/payload must fit here; real JWTs are far smaller. A segment that
 * decodes larger is rejected as malformed (also a cheap DoS bound). */
#define FF_JWT_SCRATCH  8192


const char *
ff_jwt_strerror(ff_jwt_result_t r)
{
    switch (r) {
    case FF_JWT_OK:            return "ok";
    case FF_JWT_MALFORMED:     return "malformed";
    case FF_JWT_ALG_MISMATCH:  return "algorithm mismatch";
    case FF_JWT_BAD_SIGNATURE: return "bad signature";
    case FF_JWT_EXPIRED:       return "expired";
    case FF_JWT_NOT_YET_VALID: return "not yet valid";
    case FF_JWT_INTERNAL:      return "internal error";
    default:                   return "unknown";
    }
}


/* --- base64url --- */

static int
ff_b64url_val(unsigned char c)
{
    if (c >= 'A' && c <= 'Z') return c - 'A';
    if (c >= 'a' && c <= 'z') return c - 'a' + 26;
    if (c >= '0' && c <= '9') return c - '0' + 52;
    if (c == '-') return 62;
    if (c == '_') return 63;
    return -1;
}


/*
 * Decode base64url (no padding) into out. Returns the decoded length, or -1 on an
 * invalid character / overflow. A single trailing quartet char is invalid.
 */
static long
ff_b64url_decode(const unsigned char *in, size_t inlen,
                 unsigned char *out, size_t outcap)
{
    size_t   i = 0, o = 0;
    int      v[4];

    while (i < inlen) {
        size_t  n = 0;

        while (n < 4 && i < inlen) {
            int  d = ff_b64url_val(in[i]);
            if (d < 0) {
                return -1;
            }
            v[n++] = d;
            i++;
        }

        if (n == 1) {
            return -1;   /* a lone sextet cannot form a byte */
        }

        if (o + (n - 1) > outcap) {
            return -1;
        }

        /* n is 2, 3 or 4 → 1, 2 or 3 output bytes */
        out[o++] = (unsigned char) ((v[0] << 2) | (v[1] >> 4));
        if (n >= 3) {
            out[o++] = (unsigned char) ((v[1] << 4) | (v[2] >> 2));
        }
        if (n == 4) {
            out[o++] = (unsigned char) ((v[2] << 6) | v[3]);
        }
    }

    return (long) o;
}


/* --- minimal top-level JSON object scanner (robust against injected keys) --- */

static const unsigned char *
ff_json_ws(const unsigned char *p, const unsigned char *end)
{
    while (p < end && (*p == ' ' || *p == '\t' || *p == '\n' || *p == '\r')) {
        p++;
    }
    return p;
}


/* p at the opening quote → pointer just past the closing quote, or NULL if unterminated */
static const unsigned char *
ff_json_string_end(const unsigned char *p, const unsigned char *end)
{
    p++;  /* skip opening quote */

    while (p < end) {
        if (*p == '\\') {
            p += 2;   /* skip the escaped char */
            continue;
        }
        if (*p == '"') {
            return p + 1;
        }
        p++;
    }

    return NULL;
}


/* p at the first char of a value → pointer just past it, or NULL on malformed */
static const unsigned char *
ff_json_value_end(const unsigned char *p, const unsigned char *end)
{
    if (p >= end) {
        return NULL;
    }

    if (*p == '"') {
        return ff_json_string_end(p, end);
    }

    if (*p == '{' || *p == '[') {
        int  depth = 0;

        while (p < end) {
            if (*p == '"') {
                p = ff_json_string_end(p, end);
                if (p == NULL) {
                    return NULL;
                }
                continue;
            }
            if (*p == '{' || *p == '[') {
                depth++;
            } else if (*p == '}' || *p == ']') {
                depth--;
                if (depth == 0) {
                    return p + 1;
                }
            }
            p++;
        }

        return NULL;
    }

    /* number / true / false / null — up to the next structural char or whitespace */
    while (p < end && *p != ',' && *p != '}' && *p != ']'
           && *p != ' ' && *p != '\t' && *p != '\n' && *p != '\r')
    {
        p++;
    }

    return p;
}


/*
 * Find a key at the TOP LEVEL of a JSON object and return its value span. is_string is
 * set when the value is a JSON string (span excludes the quotes). Returns 1 on hit, 0
 * if not present / malformed. Only top-level keys are matched, so a key appearing
 * inside a nested value cannot spoof a claim.
 */
static int
ff_json_find(const unsigned char *json, size_t len, const char *key,
             const unsigned char **vstart, size_t *vlen, int *is_string)
{
    const unsigned char  *p = json;
    const unsigned char  *end = json + len;
    size_t                keylen = strlen(key);

    p = ff_json_ws(p, end);
    if (p >= end || *p != '{') {
        return 0;
    }
    p++;

    for ( ;; ) {
        const unsigned char  *kstart, *kend, *vs, *ve;
        int                   vstr;

        p = ff_json_ws(p, end);
        if (p >= end || *p != '"') {
            return 0;   /* end of object or malformed */
        }

        kstart = p + 1;
        kend = ff_json_string_end(p, end);
        if (kend == NULL) {
            return 0;
        }

        p = ff_json_ws(kend, end);
        if (p >= end || *p != ':') {
            return 0;
        }

        p = ff_json_ws(p + 1, end);
        vs = p;
        vstr = (p < end && *p == '"');
        ve = ff_json_value_end(p, end);
        if (ve == NULL) {
            return 0;
        }

        /* key span excludes the surrounding quotes: [kstart, kend-1) */
        if ((size_t) ((kend - 1) - kstart) == keylen
            && memcmp(kstart, key, keylen) == 0)
        {
            if (vstr) {
                *vstart = vs + 1;
                *vlen = (size_t) ((ve - 1) - (vs + 1));
            } else {
                *vstart = vs;
                *vlen = (size_t) (ve - vs);
            }
            *is_string = vstr;
            return 1;
        }

        p = ff_json_ws(ve, end);
        if (p >= end) {
            return 0;
        }
        if (*p == ',') {
            p++;
            continue;
        }
        return 0;   /* '}' or malformed → key not found */
    }
}


/* Parse a non-negative integer JSON number span into out. Returns 1 on success. */
static int
ff_json_int(const unsigned char *s, size_t len, long long *out)
{
    long long  v = 0;
    size_t     i;

    if (len == 0) {
        return 0;
    }

    for (i = 0; i < len; i++) {
        if (s[i] < '0' || s[i] > '9') {
            return 0;   /* reject signed/fractional/exponent — claims are epoch ints */
        }
        v = v * 10 + (s[i] - '0');
    }

    *out = v;
    return 1;
}


/* --- HMAC-SHA256 --- */

static int
ff_hmac_sha256(const unsigned char *key, size_t key_len,
               const unsigned char *data, size_t data_len,
               unsigned char out[32])
{
#if OPENSSL_VERSION_NUMBER >= 0x30000000L
    EVP_MAC      *mac;
    EVP_MAC_CTX  *ctx;
    OSSL_PARAM    params[2];
    size_t        outlen = 0;
    int           ok = 0;
    char          digest[] = "SHA256";

    mac = EVP_MAC_fetch(NULL, "HMAC", NULL);
    if (mac == NULL) {
        return 0;
    }

    ctx = EVP_MAC_CTX_new(mac);
    if (ctx == NULL) {
        EVP_MAC_free(mac);
        return 0;
    }

    params[0] = OSSL_PARAM_construct_utf8_string(OSSL_MAC_PARAM_DIGEST, digest, 0);
    params[1] = OSSL_PARAM_construct_end();

    if (EVP_MAC_init(ctx, key, key_len, params) == 1
        && EVP_MAC_update(ctx, data, data_len) == 1
        && EVP_MAC_final(ctx, out, &outlen, 32) == 1
        && outlen == 32)
    {
        ok = 1;
    }

    EVP_MAC_CTX_free(ctx);
    EVP_MAC_free(mac);
    return ok;
#else
    unsigned int  outlen = 0;

    if (HMAC(EVP_sha256(), key, (int) key_len, data, data_len, out, &outlen) == NULL
        || outlen != 32)
    {
        return 0;
    }
    return 1;
#endif
}


static const char *
ff_jwt_alg_name(ff_jwt_alg_t alg)
{
    switch (alg) {
    case FF_JWT_ALG_HS256: return "HS256";
    default:               return NULL;
    }
}


ff_jwt_result_t
ff_jwt_verify(const unsigned char *token, size_t token_len, const ff_jwt_params_t *p)
{
    const unsigned char  *dot1, *dot2;
    const unsigned char  *header, *payload, *sig;
    size_t                header_len, payload_len, sig_len, signing_len;
    unsigned char         decoded[FF_JWT_SCRATCH];
    long                  dlen;
    unsigned char         mac[32];
    unsigned char         sigbuf[64];
    const unsigned char  *v;
    size_t                vlen;
    int                   is_str;
    long long             num;
    const char           *want_alg;

    want_alg = ff_jwt_alg_name(p->expected_alg);
    if (want_alg == NULL || p->key == NULL || p->key_len == 0) {
        return FF_JWT_INTERNAL;
    }

    /* split into exactly three dot-separated segments */
    dot1 = memchr(token, '.', token_len);
    if (dot1 == NULL) {
        return FF_JWT_MALFORMED;
    }

    dot2 = memchr(dot1 + 1, '.', token_len - (size_t) (dot1 + 1 - token));
    if (dot2 == NULL) {
        return FF_JWT_MALFORMED;
    }

    if (memchr(dot2 + 1, '.', token_len - (size_t) (dot2 + 1 - token)) != NULL) {
        return FF_JWT_MALFORMED;   /* a JWS has no fourth segment */
    }

    header = token;
    header_len = (size_t) (dot1 - token);
    payload = dot1 + 1;
    payload_len = (size_t) (dot2 - payload);
    sig = dot2 + 1;
    sig_len = token_len - (size_t) (sig - token);
    signing_len = (size_t) (dot2 - token);   /* header "." payload */

    if (header_len == 0 || payload_len == 0 || sig_len == 0) {
        return FF_JWT_MALFORMED;
    }

    /* --- header: pin the algorithm --- */
    dlen = ff_b64url_decode(header, header_len, decoded, sizeof(decoded));
    if (dlen < 0) {
        return FF_JWT_MALFORMED;
    }

    if (!ff_json_find(decoded, (size_t) dlen, "alg", &v, &vlen, &is_str) || !is_str) {
        return FF_JWT_MALFORMED;
    }

    /* alg:"none" and any non-pinned algorithm are rejected (no alg confusion) */
    if (vlen != strlen(want_alg) || memcmp(v, want_alg, vlen) != 0) {
        return FF_JWT_ALG_MISMATCH;
    }

    /* --- signature (HS256) --- */
    if (!ff_hmac_sha256(p->key, p->key_len, token, signing_len, mac)) {
        return FF_JWT_INTERNAL;
    }

    dlen = ff_b64url_decode(sig, sig_len, sigbuf, sizeof(sigbuf));
    if (dlen != 32) {
        return FF_JWT_BAD_SIGNATURE;   /* HS256 signature is exactly 32 bytes */
    }

    if (CRYPTO_memcmp(mac, sigbuf, 32) != 0) {
        return FF_JWT_BAD_SIGNATURE;
    }

    /* --- payload: time claims (exp required) --- */
    dlen = ff_b64url_decode(payload, payload_len, decoded, sizeof(decoded));
    if (dlen < 0) {
        return FF_JWT_MALFORMED;
    }

    if (!ff_json_find(decoded, (size_t) dlen, "exp", &v, &vlen, &is_str) || is_str
        || !ff_json_int(v, vlen, &num))
    {
        return FF_JWT_EXPIRED;   /* exp is required; missing/!numeric → deny */
    }

    if (p->now > num + p->leeway) {
        return FF_JWT_EXPIRED;
    }

    if (ff_json_find(decoded, (size_t) dlen, "nbf", &v, &vlen, &is_str) && !is_str
        && ff_json_int(v, vlen, &num))
    {
        if (p->now + p->leeway < num) {
            return FF_JWT_NOT_YET_VALID;
        }
    }

    return FF_JWT_OK;
}
