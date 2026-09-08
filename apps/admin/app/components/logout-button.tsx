import { UiButton } from './shared/ui-button';

interface LogoutButtonProps {
  readonly submitting: boolean;
  readonly message: string | null;
  readonly onLogout: () => void;
}

export function LogoutButton({ submitting, message, onLogout }: LogoutButtonProps) {
  return (
    <div className="relative w-full sm:w-auto">
      <UiButton
        variant="secondary"
        size="small"
        disabled={submitting}
        aria-busy={submitting}
        aria-describedby={message ? 'logout-error' : undefined}
        onClick={onLogout}
      >
        {submitting ? 'در حال خروج…' : 'خروج از حساب'}
      </UiButton>
      {message ? (
        <p
          className="static mt-2 w-full rounded-lg border-s-4 border-danger bg-surface px-4 py-3 leading-7 text-danger shadow-panel sm:absolute sm:end-0 sm:z-10 sm:w-96"
          id="logout-error"
          role="alert"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
