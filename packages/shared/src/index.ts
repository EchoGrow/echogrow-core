export * from './schemas/evaluation.schema';
export * from './schemas/discrepancy.schema';
export * from './schemas/roadmap.schema';
export * from './schemas/interview.schema';
export * from './schemas/evaluation-worker.schema';
export * from './schemas/spk.schema';

import whitelistData from './data/whitelist.json';
import type { WhitelistEntry } from './schemas/roadmap.schema';

// Typed whitelist so consumers get `aliases` autocomplete.
export const whitelist = whitelistData as WhitelistEntry[];