interface LogoutButtonProps {
  readonly submitting: boolean;
  readonly message: string | null;
  readonly onLogout: () => void;
}

export function LogoutButton({ submitting, message, onLogout }: LogoutButtonProps) {
  return (
    <div className="logout-control">
      <button
        className="secondary-button"
        type="button"
        disabled={submitting}
        aria-busy={submitting}
        aria-describedby={message ? 'logout-error' : undefined}
        onClick={onLogout}
      >
        {submitting ? 'در حال خروج…' : 'خروج از حساب'}
      </button>
      {message ? (
        <p className="form-error logout-error" id="logout-error" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
