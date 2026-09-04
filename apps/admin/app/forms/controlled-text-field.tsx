'use client';

import { Input } from 'antd';
import { Controller } from 'react-hook-form';
import type { Control, FieldPath, FieldValues, RegisterOptions } from 'react-hook-form';

interface ControlledTextFieldProps<TValues extends FieldValues, TName extends FieldPath<TValues>> {
  readonly control: Control<TValues>;
  readonly name: TName;
  readonly label: string;
  readonly rules?: Omit<
    RegisterOptions<TValues, TName>,
    'disabled' | 'setValueAs' | 'valueAsDate' | 'valueAsNumber'
  >;
  readonly disabled?: boolean;
  readonly autoComplete?: string;
  readonly idPrefix?: string;
}

function fieldId(name: string, prefix = 'field'): string {
  return `${prefix}-${name.replace(/[^a-zA-Z0-9_-]/gu, '-')}`;
}

export function ControlledTextField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  rules,
  disabled = false,
  autoComplete,
  idPrefix,
}: ControlledTextFieldProps<TValues, TName>) {
  const id = fieldId(name, idPrefix);
  const errorId = `${id}-error`;

  return (
    <Controller
      control={control}
      name={name}
      {...(rules ? { rules } : {})}
      render={({ field, fieldState }) => (
        <div className="controlled-field">
          <label htmlFor={id}>{label}</label>
          <Input
            id={id}
            name={field.name}
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            {...(fieldState.invalid ? { status: 'error' as const } : {})}
            {...(fieldState.error ? { 'aria-describedby': errorId } : {})}
            {...(autoComplete ? { autoComplete } : {})}
          />
          {fieldState.error ? (
            <p id={errorId} className="field-error" role="alert">
              {fieldState.error.message}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}
