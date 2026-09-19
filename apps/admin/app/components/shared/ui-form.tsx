import type {
  FormHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  OptionHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { forwardRef } from 'react';
import { classNames } from './class-names';

const Root = forwardRef<HTMLFormElement, FormHTMLAttributes<HTMLFormElement>>(function UiFormRoot(
  { className, noValidate = true, ...attributes },
  ref,
) {
  return (
    <form
      ref={ref}
      className={classNames('grid gap-5', className)}
      noValidate={noValidate}
      {...attributes}
    />
  );
});

function Field({ className, ...attributes }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classNames('grid min-w-0 gap-2', className)} {...attributes} />;
}

function Label({ className, ...attributes }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={classNames('text-sm font-bold text-foreground', className)} {...attributes} />
  );
}

const CONTROL_CLASSES =
  'min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-foreground shadow-sm transition-colors placeholder:text-muted focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger aria-invalid:focus:ring-danger/20';

const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function UiFormTextInput({ className, type = 'text', ...attributes }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={classNames(CONTROL_CLASSES, className)}
        {...attributes}
      />
    );
  },
);

const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function UiFormTextArea({ className, ...attributes }, ref) {
    return (
      <textarea
        ref={ref}
        className={classNames(CONTROL_CLASSES, 'min-h-24 resize-y', className)}
        {...attributes}
      />
    );
  },
);

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function UiFormSelect({ className, ...attributes }, ref) {
    return (
      <select ref={ref} className={classNames(CONTROL_CLASSES, className)} {...attributes} />
    );
  },
);

function Option({ ...attributes }: OptionHTMLAttributes<HTMLOptionElement>) {
  return <option {...attributes} />;
}

function ErrorMessage({ className, role = 'alert', ...attributes }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={classNames('m-0 text-xs leading-6 text-danger', className)}
      role={role}
      {...attributes}
    />
  );
}

const SubmissionError = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function UiFormSubmissionError({ className, role = 'alert', ...attributes }, ref) {
    return (
      <p
        ref={ref}
        className={classNames(
          'm-0 rounded-xl border-s-4 border-danger bg-red-50 px-4 py-3 text-sm leading-7 text-red-900 dark:bg-red-950/30 dark:text-red-200',
          className,
        )}
        role={role}
        tabIndex={-1}
        {...attributes}
      />
    );
  },
);

function Actions({ className, ...attributes }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={classNames('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...attributes}
    />
  );
}

export const UiForm = {
  Root,
  Field,
  Label,
  TextInput,
  TextArea,
  Select,
  Option,
  Error: ErrorMessage,
  SubmissionError,
  Actions,
} as const;
