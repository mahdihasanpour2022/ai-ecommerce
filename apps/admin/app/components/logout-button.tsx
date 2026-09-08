'use client';

import { Modal } from 'antd';
import { useState } from 'react';
import { UiButton } from './shared/ui-button';

interface LogoutButtonProps {
  readonly submitting: boolean;
  readonly message: string | null;
  readonly onLogout: () => void;
}

export function LogoutButton({ submitting, message, onLogout }: LogoutButtonProps) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  function confirmLogout() {
    if (submitting) return;
    setConfirmationOpen(false);
    onLogout();
  }

  return (
    <>
      <div className="relative w-full sm:w-auto">
        <UiButton
          variant="secondary"
          size="small"
          disabled={submitting}
          aria-busy={submitting}
          aria-describedby={message ? 'logout-error' : undefined}
          onClick={() => setConfirmationOpen(true)}
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
      <Modal
        open={confirmationOpen}
        title="خروج از حساب کاربری"
        okText="بله، خارج میشوم"
        cancelText="انصراف"
        okButtonProps={{
          danger: true,
          disabled: submitting,
          className: 'text-white! hover:text-white!',
        }}
        cancelButtonProps={{ autoFocus: true, disabled: submitting }}
        closable={!submitting}
        keyboard={!submitting}
        mask={{ closable: !submitting }}
        confirmLoading={submitting}
        onOk={confirmLogout}
        onCancel={() => {
          if (!submitting) setConfirmationOpen(false);
        }}
      >
        <p className="m-0 leading-8 text-muted">
          آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟
        </p>
      </Modal>
    </>
  );
}
