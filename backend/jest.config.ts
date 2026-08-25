import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
    verbose: true,
    // The MariaDB integration suites run in parallel against one database, so a
    // beforeAll (connect + migrate) can exceed jest's 5s default under DB
    // contention. Unit tests are unaffected (this is a ceiling, not a delay).
    testTimeout: 30000,
    transform: {
        '^.+\\.ts?$': [
            'ts-jest',
            {
                useESM: true,
                // transpile-only: types are checked by the separate `tsc --noEmit`
                // CI job. Avoids rootDir errors for tests importing sibling helpers
                // outside src/ and silences the hybrid-module ts-jest warning.
                isolatedModules: true,
            },
        ],
    },
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    setupFilesAfterEnv: [
        'jest-expect-message',
        './jest.setup.ts'
    ]
};

export default config;