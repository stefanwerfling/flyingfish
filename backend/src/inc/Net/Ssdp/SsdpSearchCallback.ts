/**
 * SsdpSearchArgs
 */
export type SsdpSearchArgs = [Record<string, string>, string];

/**
 * SsdpSearchCallback
 */
export type SsdpSearchCallback = (...args: SsdpSearchArgs) => void;