import {createHash, timingSafeEqual} from 'crypto';

/**
 * ServiceAuth
 *
 * Central service-to-service authentication (phase 3, step 5.3 - PKI pre-stage).
 *
 * Today it verifies the shared `secret` with a constant-time comparison; it is
 * the single seam through which per-service PKI/mTLS auth will replace the shared
 * secret later. Callers pass the provided and the expected secret; the scattered
 * `provided === expected` checks (himhip, nginx) route through here instead.
 */
export class ServiceAuth {

    /**
     * Verify a provided shared secret against the expected one in constant time.
     *
     * An empty expected secret (misconfiguration) always fails, so a missing
     * config can never accept an empty provided secret. Both values are hashed to
     * a fixed-length digest first so the comparison neither leaks length nor
     * throws on a length mismatch.
     * @param {string} provided
     * @param {string} expected
     * @returns {boolean}
     */
    public static verifySecret(provided: string, expected: string): boolean {
        if (expected.length === 0) {
            return false;
        }

        const providedDigest = createHash('sha256').update(provided).digest();
        const expectedDigest = createHash('sha256').update(expected).digest();

        return timingSafeEqual(providedDigest, expectedDigest);
    }

}