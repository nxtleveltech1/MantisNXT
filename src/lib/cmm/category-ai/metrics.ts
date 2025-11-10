const VERBOSE = false;

export const metrics = {
  batchesStarted: 0,
  batchesSucceeded: 0,
  batchesTimedOut: 0,
  batchesFailed: 0,
  providerFallbacks: 0,
  providerTimeouts: 0,
  schemaUsed: 0,
  jsonModeUsed: 0,
};

export function mark(event: keyof typeof metrics): void {
  metrics[event]++;
  if (VERBOSE) {
    console.log(`[category-ai:metrics] ${event} -> ${metrics[event]}`);
  }
}
