interface StatusPanelProps {
  readonly title: string;
  readonly message: string;
  readonly busy?: boolean;
  readonly onRetry?: () => void;
}

export function StatusPanel({ title, message, busy = false, onRetry }: StatusPanelProps) {
  if (busy) return <AppLoading fullscreen message={title} />;

  return (
    <main className="centered-page">
      <section className="status-card" aria-live="assertive" role="alert">
        <h1>{title}</h1>
        <p>{message}</p>
        {onRetry ? (
          <button className="secondary-button" type="button" onClick={onRetry}>
            تلاش دوباره
          </button>
        ) : null}
      </section>
    </main>
  );
}
import { AppLoading } from './app-loading';
