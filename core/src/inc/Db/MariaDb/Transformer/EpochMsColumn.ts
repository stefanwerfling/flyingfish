import {ValueTransformer} from 'typeorm';

/**
 * Persists an epoch-millisecond timestamp in a `bigint` column while keeping the entity
 * property a plain `number`.
 *
 * Millisecond epochs (~1.8e12) far exceed a signed 32-bit `int` (max 2_147_483_647) — the
 * cause of the `ER_WARN_DATA_OUT_OF_RANGE` crash when the PKI wrote `Date.now()` into its
 * `int` timestamp columns — but sit well within `Number.MAX_SAFE_INTEGER` (~9e15), so the
 * round-trip is lossless. TypeORM returns `bigint` columns as strings by default; the
 * `from` hook converts them back to `number` so arithmetic and comparisons keep working.
 */
export const epochMsColumnTransformer: ValueTransformer = {
    to: (value: number | null): number | null => value,
    from: (value: string | number | null): number => {
        if (value === null || value === undefined) {
            return 0;
        }

        return typeof value === 'number' ? value : Number(value);
    }
};
