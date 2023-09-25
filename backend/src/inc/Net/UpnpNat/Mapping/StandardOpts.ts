import {StandardOptAddress} from './StandardOptAddress.js';

/**
 * Standard options.
 */
export type StandardOpts = {
    public?: number | StandardOptAddress | string;
    private?: number | StandardOptAddress | string;
    protocol?: string;
};