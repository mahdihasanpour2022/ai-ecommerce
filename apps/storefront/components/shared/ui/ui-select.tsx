'use client';

import clsx from 'clsx';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  KeyboardEvent,
  MutableRefObject,
  ReactNode,
  Ref,
} from 'react';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

interface UiSelectContextValue {
  readonly contentId: string;
  readonly open: boolean;
  readonly selectedValue: string | undefined;
  readonly setOpen: (open: boolean) => void;
  readonly selectValue: (value: string) => void;
  readonly triggerId: string;
  readonly triggerRef: MutableRefObject<HTMLButtonElement | null>;
}

const UiSelectContext = createContext<UiSelectContextValue | null>(null);

function useUiSelect(): UiSelectContextValue {
  const context = useContext(UiSelectContext);
  if (!context) throw new Error('UiSelect compound components must be used within UiSelect.');
  return context;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

export interface UiSelectProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly value?: string;
}

function UiSelectRoot({
  children,
  className,
  defaultValue,
  onValueChange,
  value,
  ...attributes
}: UiSelectProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  const selectValue = useCallback(
    (nextValue: string) => {
      if (value === undefined) setInternalValue(nextValue);
      onValueChange?.(nextValue);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onValueChange, value],
  );

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  return (
    <UiSelectContext.Provider
      value={{
        contentId: `${id}-content`,
        open,
        selectedValue: value ?? internalValue,
        setOpen,
        selectValue,
        triggerId: `${id}-trigger`,
        triggerRef,
      }}
    >
      <div ref={rootRef} className={clsx('relative inline-block', className)} {...attributes}>
        {children}
      </div>
    </UiSelectContext.Provider>
  );
}

export type UiSelectTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

const UiSelectTrigger = forwardRef<HTMLButtonElement, UiSelectTriggerProps>(
  function UiSelectTrigger(
    { children, className, onClick, onKeyDown, type = 'button', ...attributes },
    ref,
  ) {
    const { contentId, open, setOpen, triggerId, triggerRef } = useUiSelect();

    const focusOption = (position: 'first' | 'last') => {
      requestAnimationFrame(() => {
        const options = document.querySelectorAll<HTMLElement>(
          `#${CSS.escape(contentId)} [role="option"]:not([aria-disabled="true"])`,
        );
        options[position === 'first' ? 0 : options.length - 1]?.focus();
      });
    };

    return (
      <button
        {...attributes}
        ref={(node) => {
          triggerRef.current = node;
          setRef(ref, node);
        }}
        id={triggerId}
        type={type}
        aria-controls={contentId}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={clsx(
          'focus-visible:outline-brand cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2',
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) setOpen(!open);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            focusOption(event.key === 'ArrowDown' ? 'first' : 'last');
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        {children}
      </button>
    );
  },
);

export type UiSelectContentProps = HTMLAttributes<HTMLDivElement>;

const UiSelectContent = forwardRef<HTMLDivElement, UiSelectContentProps>(function UiSelectContent(
  { children, className, onKeyDown, ...attributes },
  ref,
) {
  const { contentId, open, setOpen, triggerId, triggerRef } = useUiSelect();

  if (!open) return null;

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>, direction: 1 | -1) => {
    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        '[role="option"]:not([aria-disabled="true"])',
      ),
    );
    if (options.length === 0) return;
    const currentIndex = options.indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + direction + options.length) % options.length;
    options[nextIndex]?.focus();
  };

  return (
    <div
      {...attributes}
      ref={ref}
      id={contentId}
      role="listbox"
      aria-labelledby={triggerId}
      className={clsx(
        'bg-background border-foreground/15 absolute inset-e-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border p-1 shadow-lg',
        className,
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          moveFocus(event, event.key === 'ArrowDown' ? 1 : -1);
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          const options = event.currentTarget.querySelectorAll<HTMLElement>(
            '[role="option"]:not([aria-disabled="true"])',
          );
          options[event.key === 'Home' ? 0 : options.length - 1]?.focus();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        } else if (event.key === 'Tab') {
          setOpen(false);
        }
      }}
    >
      {children}
    </div>
  );
});

export type UiSelectLabelProps = HTMLAttributes<HTMLDivElement>;

const UiSelectLabel = forwardRef<HTMLDivElement, UiSelectLabelProps>(function UiSelectLabel(
  { className, ...attributes },
  ref,
) {
  return (
    <div
      ref={ref}
      role="presentation"
      className={clsx(
        'text-foreground/60 border-foreground/10 border-b px-3 py-2 text-xs',
        className,
      )}
      {...attributes}
    />
  );
});

export interface UiSelectOptionProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onSelect' | 'value'
> {
  readonly closeOnSelect?: boolean;
  readonly onSelect?: () => void;
  readonly value: string;
}

const UiSelectOption = forwardRef<HTMLButtonElement, UiSelectOptionProps>(function UiSelectOption(
  { children, className, closeOnSelect = true, disabled, onClick, onSelect, value, ...attributes },
  ref,
) {
  const { selectedValue, selectValue } = useUiSelect();

  return (
    <button
      {...attributes}
      ref={ref}
      type="button"
      role="option"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      aria-selected={selectedValue === value}
      disabled={disabled}
      className={clsx(
        'hover:bg-foreground/5 focus-visible:bg-foreground/10 focus-visible:outline-brand flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-right text-sm focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || disabled) return;
        onSelect?.();
        if (closeOnSelect) selectValue(value);
      }}
    >
      {children}
    </button>
  );
});

export const UiSelect = Object.assign(UiSelectRoot, {
  Content: UiSelectContent,
  Label: UiSelectLabel,
  Option: UiSelectOption,
  Trigger: UiSelectTrigger,
});
