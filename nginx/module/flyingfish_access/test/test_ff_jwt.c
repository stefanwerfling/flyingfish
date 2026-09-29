/*
 * Standalone unit test for ngx_ff_jwt (Phase F, F.3). Reads "code<TAB>leeway<TAB>token"
 * lines (see jwt_gen.mjs) from stdin, verifies each token with the HS256 secret and the
 * fixed `now` given on argv, and asserts the result matches the expected code.
 *
 * Build:  cc -Wall -Wextra test_ff_jwt.c ../ngx_ff_jwt.c -lcrypto -o /tmp/test_ff_jwt
 * Run:    node jwt_gen.mjs <secret> <now> | /tmp/test_ff_jwt <secret> <now>
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../ngx_ff_jwt.h"

int
main(int argc, char **argv)
{
    const char  *secret;
    long long    now;
    char         line[16384];
    int          total = 0, failed = 0;

    if (argc != 3) {
        fprintf(stderr, "usage: %s <secret> <now>\n", argv[0]);
        return 2;
    }

    secret = argv[1];
    now = atoll(argv[2]);

    while (fgets(line, sizeof(line), stdin) != NULL) {
        char             *tab1, *tab2, *nl;
        int               expected;
        long              leeway;
        const char       *token;
        ff_jwt_params_t   p;
        ff_jwt_result_t   got;

        nl = strchr(line, '\n');
        if (nl) {
            *nl = '\0';
        }
        if (line[0] == '\0') {
            continue;
        }

        tab1 = strchr(line, '\t');
        if (!tab1) {
            continue;
        }
        *tab1 = '\0';
        tab2 = strchr(tab1 + 1, '\t');
        if (!tab2) {
            continue;
        }
        *tab2 = '\0';

        expected = atoi(line);
        leeway = atol(tab1 + 1);
        token = tab2 + 1;

        p.expected_alg = FF_JWT_ALG_HS256;
        p.key = (const unsigned char *) secret;
        p.key_len = strlen(secret);
        p.now = now;
        p.leeway = leeway;

        got = ff_jwt_verify((const unsigned char *) token, strlen(token), &p);

        total++;
        if ((int) got != expected) {
            failed++;
            fprintf(stderr, "FAIL: expected %d (%s), got %d (%s)\n  token: %.60s...\n",
                    expected, ff_jwt_strerror((ff_jwt_result_t) expected),
                    (int) got, ff_jwt_strerror(got), token);
        }
    }

    printf("%d/%d passed\n", total - failed, total);
    return failed == 0 ? 0 : 1;
}
