import { UiLoading } from './shared/ui-loading';
import { UiButton } from './shared/ui-button';

interface StatusPanelProps {
  readonly title: string;
  readonly message: string;
  readonly busy?: boolean;
  readonly onRetry?: () => void;
}

export function StatusPanel({ title, message, busy = false, onRetry }: StatusPanelProps) {
  if (busy) return <UiLoading fullscreen message={title} />;

  return (
    <main className="grid min-h-screen place-items-center bg-admin-background p-4 sm:p-10">
      <section
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 text-center shadow-panel sm:p-10"
        aria-live="assertive"
        role="alert"
      >
        <h1 className="m-0 text-2xl font-bold leading-snug">{title}</h1>
        <p className="mb-0 mt-3 leading-8 text-muted">{message}</p>
        {onRetry ? (
          <UiButton className="mt-4" variant="secondary" onClick={onRetry}>
            تلاش دوباره
          </UiButton>
        ) : null}
      </section>
    </main>
  );
}
