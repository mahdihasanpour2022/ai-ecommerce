'use client';

import { Modal } from 'antd';
import type { ModalProps } from 'antd';

export type UiModalRootProps = Omit<ModalProps, 'footer'> & {
  readonly footer?: ModalProps['footer'];
};

function Root({ centered = true, destroyOnHidden = true, footer = null, ...props }: UiModalRootProps) {
  return (
    <Modal
      centered={centered}
      destroyOnHidden={destroyOnHidden}
      footer={footer}
      {...props}
    />
  );
}

export const UiModal = { Root } as const;
