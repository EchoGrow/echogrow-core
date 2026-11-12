import { Alert, Button } from '../ui';

export interface DashboardErrorStateProps {
  /** Title shown in bold (e.g. "Could not load the growth plan"). */
  title: string;
  /** Error message from the API / fetch. */
  message: string;
  /** Called when the user clicks "Try again". */
  onRetry: () => void;
  /** Whether the retry is currently in progress. */
  isRetrying?: boolean;
  /** Where "Back to overview" links to. */
  backHref: string;
}

/**
 * Shared error state used across all dashboard tabs.
 * Matches the design in the reference screenshot:
 *   - Alert box with error variant
 *   - "Try again" button on the right
 *   - "← Back to overview" link below
 */
export function DashboardErrorState({
  title,
  message,
  onRetry,
  isRetrying = false,
  backHref,
}: DashboardErrorStateProps) {
  return (
    <div className="mx-auto max-w-xl py-8 animate-fade-up">
      <Alert
        variant="error"
        title={title}
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying…' : 'Try again'}
          </Button>
        }
      >
        {message}
      </Alert>

      <a
        href={backHref}
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
      >
        ← Back to overview
      </a>
    </div>
  );
}