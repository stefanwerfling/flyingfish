import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
    verbose: true,
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