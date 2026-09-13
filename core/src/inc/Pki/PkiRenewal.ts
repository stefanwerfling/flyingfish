/**
 * Renewal timing for issued leaf certificates (own-PKI epic 9.4, slice 9.4.3).
 *
 * A leaf should renew well before it expires so a missed renewal window never
 * takes a node offline. The design renews at ~2/3 of the certificate lifetime:
 * early enough to retry across the remaining third, late enough to avoid
 * needless churn. Pure time math over the issued/expires epochs — no crypto, no
 * clock of its own (the caller passes `now`, which keeps it deterministic in
 * tests).
 */
export class PkiRenewal {

    /**
     * The fraction of the lifetime after which renewal becomes due (~2/3).
     */
    public static readonly LIFETIME_FRACTION = 2 / 3;

    /**
     * The epoch-ms instant at which renewal becomes due for a certificate. An
     * invalid window (expiresAt <= issuedAt) collapses to issuedAt, so such a
     * certificate is always considered due.
     * @param issuedAt - issuance timestamp (epoch ms)
     * @param expiresAt - expiry timestamp (epoch ms)
     */
    public static renewAt(issuedAt: number, expiresAt: number): number {
        const lifetime = expiresAt - issuedAt;

        if (lifetime <= 0) {
            return issuedAt;
        }

        return issuedAt + Math.floor(lifetime * PkiRenewal.LIFETIME_FRACTION);
    }

    /**
     * Whether renewal is due for a certificate at the given instant.
     * @param issuedAt - issuance timestamp (epoch ms)
     * @param expiresAt - expiry timestamp (epoch ms)
     * @param now - the instant to test (epoch ms)
     */
    public static isDue(issuedAt: number, expiresAt: number, now: number): boolean {
        return now >= PkiRenewal.renewAt(issuedAt, expiresAt);
    }

}