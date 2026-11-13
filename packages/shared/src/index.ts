export * from './schemas/evaluation.schema';
export * from './schemas/discrepancy.schema';
export * from './schemas/roadmap.schema';
export * from './schemas/interview.schema';
export * from './schemas/evaluation-worker.schema';
export * from './schemas/spk.schema';
export * from './schemas/comparison.schema';

export * from './data/job-titles';

import whitelistData from './data/whitelist.json';
import type { WhitelistEntry } from './schemas/roadmap.schema';

export const whitelist = whitelistData as WhitelistEntry[];