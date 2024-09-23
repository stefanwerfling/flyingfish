import {Logger} from 'flyingfish_core';
import {SchemaMatchers} from '../src/types/ExpectSchema';
import 'jest-expect-message';

expect.extend(SchemaMatchers);

describe('Test Logger instance', () => {
    test('Logging info', async() => {
        try {
            Logger.getLogger().info('Test log Info');

            expect(true).toBe(true);
        } catch (e) {
            expect(false, `Logger throw error: ${e}`).toBe(true);
        }
    });
});