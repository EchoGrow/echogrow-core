export const EVALUATION_QUEUE_NAME = 'evaluation';
export const EVALUATION_JOB_NAME = 'evaluate-interview';

export const EVALUATION_DIMENSIONS = [
  'Technical Depth',
  'Communication Clarity',
  'Domain Experience',
  'Problem Solving',
] as const;

export type EvaluationDimensionName = (typeof EVALUATION_DIMENSIONS)[number];

