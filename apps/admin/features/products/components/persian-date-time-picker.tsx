'use client';

import persian from 'react-date-object/calendars/persian';
import persianFa from 'react-date-object/locales/persian_fa';
import DatePicker, { type ChangedValue } from 'react-multi-date-picker';
import TimePicker from 'react-multi-date-picker/plugins/time_picker';

const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

interface PersianDateTimePickerProps {
  readonly id: string;
  readonly name: string;
  readonly value: string;
  readonly placeholder: string;
  readonly invalid?: boolean;
  readonly describedBy?: string | undefined;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
}

function asDate(value: string): Date | null {
  if (!ISO_DATE_TIME_PATTERN.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) || date.toISOString() !== value ? null : date;
}

function toIsoDateTime(value: ChangedValue): string {
  return value === null ? '' : value.toDate().toISOString();
}

export function PersianDateTimePicker({
  id,
  name,
  value,
  placeholder,
  invalid = false,
  describedBy,
  onChange,
  onBlur,
}: PersianDateTimePickerProps) {
  return (
    <DatePicker
      id={id}
      name={name}
      value={asDate(value)}
      calendar={persian}
      locale={persianFa}
      format="YYYY/MM/DD HH:mm:ss"
      calendarPosition="bottom-right"
      onChange={(nextValue) => onChange(toIsoDateTime(nextValue))}
      plugins={[<TimePicker key="time-picker" position="bottom" />]}
      render={(displayValue, openCalendar) => (
        <button
          id={id}
          type="button"
          dir="rtl"
          className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-right text-foreground shadow-sm transition-colors hover:bg-surface-subtle focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20 data-[invalid=true]:border-danger data-[invalid=true]:focus:ring-danger/20"
          data-invalid={invalid}
          aria-describedby={describedBy}
          onClick={openCalendar}
          onBlur={onBlur}
        >
          <span className={displayValue ? '' : 'text-muted text-xs'}>
            {displayValue || placeholder}
          </span>
          <span aria-hidden="true" className="text-muted">
            ▣
          </span>
        </button>
      )}
    />
  );
}
