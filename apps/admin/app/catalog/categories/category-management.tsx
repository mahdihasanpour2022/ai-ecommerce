'use client';

import { Select } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { ControlledTextField } from '../../forms/controlled-text-field';
import { useAuth } from '../../auth/auth-provider';
import { catalogApi } from '../catalog-api';
import type {
  CatalogApi,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../catalog-api';
import type { CategoryDto } from '../catalog-contracts';
import { classifyCatalogFailure } from '../catalog-errors';
import { useCatalogCapabilities } from '../catalog-shell';
import { CatalogState } from '../catalog-state';
import {
  categoryNameError,
  categoryOptions,
  findCategory,
  normalizeCategoryName,
} from './category-model';
import { categoryFailurePresentation } from './category-failures';

type CategoryClient = Pick<
  CatalogApi,
  'categories' | 'createCategory' | 'updateCategory' | 'deleteCategory'
>;

interface EditorState {
  readonly mode: 'create' | 'edit';
  readonly category?: CategoryDto;
  readonly parentId: string | null;
  readonly opener: HTMLElement;
}

interface DeleteState {
  readonly category: CategoryDto;
  readonly opener: HTMLElement;
}

interface CategoryFormValues {
  readonly name: string;
  readonly parentId: string | null;
}

const NOOP = () => undefined;

function focusLater(target?: HTMLElement | null) {
  globalThis.setTimeout(() => target?.focus(), 0);
}

function DialogFrame({
  title,
  titleId,
  busy,
  onClose,
  children,
  initialFocus,
}: Readonly<{
  title: string;
  titleId: string;
  busy: boolean;
  onClose(): void;
  children: ReactNode;
  initialFocus: RefObject<HTMLElement | null>;
}>) {
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initialFocus.current?.focus();
  }, [initialFocus]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      dialog.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [role="combobox"]:not([aria-disabled="true"]), a[href]',
      ) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div className="category-dialog-backdrop">
      <div
        ref={dialog}
        className="category-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ParentField({
  control,
  options,
  disabled,
}: Readonly<{
  control: ReturnType<typeof useForm<CategoryFormValues>>['control'];
  options: ReturnType<typeof categoryOptions>;
  disabled: boolean;
}>) {
  return (
    <Controller
      control={control}
      name="parentId"
      render={({ field, fieldState }) => (
        <div className="controlled-field">
          <label htmlFor="category-parent">دسته‌بندی والد</label>
          <Select
            id="category-parent"
            value={field.value ?? '__root__'}
            onChange={(value: string) => field.onChange(value === '__root__' ? null : value)}
            onBlur={field.onBlur}
            ref={field.ref}
            disabled={disabled}
            {...(fieldState.invalid ? { status: 'error' as const } : {})}
            aria-invalid={fieldState.invalid}
            options={options.map((option) => ({
              value: option.value ?? '__root__',
              label:
                option.value === null
                  ? option.label
                  : `${'— '.repeat(Math.max(0, option.level - 1))}${option.label}`,
            }))}
          />
          <p className="field-hint">
            انتخاب‌های نامعتبرِ قابل مشاهده حذف شده‌اند؛ اعتبار نهایی ساختار با سرور است.
          </p>
          {fieldState.error ? (
            <p className="field-error" role="alert">
              {fieldState.error.message}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}

function CategoryEditorDialog({
  state,
  tree,
  client,
  onClose,
  onSaved,
  onPermissionDenied,
}: Readonly<{
  state: EditorState;
  tree: readonly CategoryDto[];
  client: CategoryClient;
  onClose(): void;
  onSaved(category: CategoryDto): void;
  onPermissionDenied(): void;
}>) {
  const heading = useRef<HTMLHeadingElement>(null);
  const pending = useRef(false);
  const [summary, setSummary] = useState<string | null>(null);
  const category = state.category;
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<CategoryFormValues>({
    defaultValues: {
      name: category?.name ?? '',
      parentId: category?.parentId ?? state.parentId,
    },
    shouldFocusError: true,
  });

  useEffect(() => {
    const preventUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [isDirty]);

  const close = () => {
    if (isDirty && !window.confirm('تغییرات ذخیره‌نشده کنار گذاشته شود؟')) return;
    onClose();
    focusLater(state.opener);
  };

  const submit = handleSubmit(async (values) => {
    if (pending.current) return;
    pending.current = true;
    setSummary(null);
    try {
      const name = normalizeCategoryName(values.name);
      let result: CategoryDto;
      if (state.mode === 'create') {
        const input: CreateCategoryInput = { name, parentId: values.parentId };
        result = await client.createCategory(input);
      } else {
        const input: UpdateCategoryInput = {
          ...(name === category?.name ? {} : { name }),
          ...(values.parentId === category?.parentId ? {} : { parentId: values.parentId }),
        };
        if (Object.keys(input).length === 0) {
          setSummary('برای ذخیره، نام یا والد دسته‌بندی را تغییر دهید.');
          heading.current?.focus();
          return;
        }
        result = await client.updateCategory(category!.id, input);
      }
      reset({ name: result.name, parentId: result.parentId });
      onSaved(result);
    } catch (error) {
      const failure = categoryFailurePresentation(error);
      setSummary(failure.message);
      if (failure.field === 'name') {
        setError('name', { type: 'server', message: failure.message }, { shouldFocus: true });
      } else if (failure.field === 'parentId') {
        setError('parentId', { type: 'server', message: failure.message }, { shouldFocus: true });
      } else {
        heading.current?.focus();
      }
      if (failure.code === 'INSUFFICIENT_PERMISSION') onPermissionDenied();
    } finally {
      pending.current = false;
    }
  });

  return (
    <DialogFrame
      title={state.mode === 'create' ? 'افزودن دسته‌بندی' : `ویرایش ${category?.name ?? ''}`}
      titleId="category-editor-title"
      busy={isSubmitting}
      onClose={close}
      initialFocus={heading}
    >
      <form className="category-form" noValidate onSubmit={(event) => void submit(event)}>
        <p className="field-hint">
          نام پس از یکسان‌سازی فاصله‌ها ذخیره می‌شود. همهٔ فیلدهای الزامی مشخص شده‌اند.
        </p>
        {summary ? (
          <p className="form-error" role="alert" tabIndex={-1} ref={heading}>
            {summary}
          </p>
        ) : (
          <span ref={heading} tabIndex={-1} className="focus-anchor" />
        )}
        <ControlledTextField
          control={control}
          name="name"
          label="نام دسته‌بندی (الزامی)"
          disabled={isSubmitting}
          autoComplete="off"
          rules={{ validate: (value) => categoryNameError(value) ?? true }}
        />
        <ParentField
          control={control}
          options={categoryOptions(tree, category?.id)}
          disabled={isSubmitting}
        />
        <div className="category-dialog-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={isSubmitting}
            onClick={close}
          >
            انصراف
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function DeleteCategoryDialog({
  state,
  client,
  onClose,
  onDeleted,
  onPermissionDenied,
}: Readonly<{
  state: DeleteState;
  client: CategoryClient;
  onClose(): void;
  onDeleted(category: CategoryDto): void;
  onPermissionDenied(): void;
}>) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    onClose();
    focusLater(state.opener);
  };

  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await client.deleteCategory(state.category.id);
      onDeleted(state.category);
    } catch (caught) {
      const failure = categoryFailurePresentation(caught);
      setError(failure.message);
      if (failure.code === 'INSUFFICIENT_PERMISSION') onPermissionDenied();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <DialogFrame
      title={`حذف ${state.category.name}`}
      titleId="category-delete-title"
      busy={busy}
      onClose={close}
      initialFocus={cancelButton}
    >
      <p>
        آیا از حذف «{state.category.name}» مطمئن هستید؟ وجود زیرمجموعه یا هر محصولی مانع حذف
        می‌شود.
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="category-dialog-actions">
        <button
          ref={cancelButton}
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={close}
        >
          انصراف
        </button>
        <button
          className="danger-button"
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={() => void remove()}
        >
          {busy ? 'در حال حذف…' : 'حذف دسته‌بندی'}
        </button>
      </div>
    </DialogFrame>
  );
}

function CategoryTree({
  tree,
  canManage,
  expanded,
  onToggle,
  onCreate,
  onEdit,
  onDelete,
}: Readonly<{
  tree: readonly CategoryDto[];
  canManage: boolean;
  expanded: ReadonlySet<string>;
  onToggle(categoryId: string): void;
  onCreate(category: CategoryDto, opener: HTMLElement): void;
  onEdit(category: CategoryDto, opener: HTMLElement): void;
  onDelete(category: CategoryDto, opener: HTMLElement): void;
}>) {
  const renderNodes = (nodes: readonly CategoryDto[]) => (
    <ul className="category-tree" role="group">
      {nodes.map((category) => {
        const hasChildren = category.children.length > 0;
        const isExpanded = expanded.has(category.id);
        const childrenId = `category-children-${category.id}`;
        return (
          <li key={category.id} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
            <div className="category-node" data-category-id={category.id} tabIndex={-1}>
              {hasChildren ? (
                <button
                  className="category-disclosure"
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={childrenId}
                  aria-label={`${isExpanded ? 'بستن' : 'باز کردن'} زیرمجموعه‌های ${category.name}`}
                  onClick={() => onToggle(category.id)}
                >
                  {isExpanded ? '−' : '+'}
                </button>
              ) : (
                <span className="category-leaf-marker" aria-hidden="true">
                  •
                </span>
              )}
              <span className="category-node-name">{category.name}</span>
              <span className="category-level">سطح {category.level.toLocaleString('fa-IR')}</span>
              {canManage ? (
                <span className="category-node-actions">
                  <button
                    className="category-action"
                    type="button"
                    onClick={(event) => onCreate(category, event.currentTarget)}
                  >
                    افزودن زیرمجموعه
                  </button>
                  <button
                    className="category-action"
                    type="button"
                    onClick={(event) => onEdit(category, event.currentTarget)}
                  >
                    ویرایش
                  </button>
                  {!hasChildren ? (
                    <button
                      className="category-action category-delete-action"
                      type="button"
                      onClick={(event) => onDelete(category, event.currentTarget)}
                    >
                      حذف
                    </button>
                  ) : null}
                </span>
              ) : null}
            </div>
            {hasChildren && isExpanded ? (
              <div id={childrenId}>{renderNodes(category.children)}</div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="category-tree-panel" role="tree" aria-label="درخت دسته‌بندی‌ها">
      {renderNodes(tree)}
    </div>
  );
}

function parentIds(tree: readonly CategoryDto[]): Set<string> {
  const ids = new Set<string>();
  const visit = (nodes: readonly CategoryDto[]) => {
    for (const node of nodes) {
      if (node.children.length > 0) ids.add(node.id);
      visit(node.children);
    }
  };
  visit(tree);
  return ids;
}

export function CategoryManagementView({
  canManage,
  client = catalogApi,
  onPermissionDenied = NOOP,
}: Readonly<{
  canManage: boolean;
  client?: CategoryClient;
  onPermissionDenied?: () => void;
}>) {
  const heading = useRef<HTMLHeadingElement>(null);
  const requestVersion = useRef(0);
  const [tree, setTree] = useState<readonly CategoryDto[]>([]);
  const [readState, setReadState] = useState<'loading' | 'ready' | 'error' | 'forbidden'>('loading');
  const [readMessage, setReadMessage] = useState('');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<DeleteState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [focusAfterRead, setFocusAfterRead] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal, focusId?: string | null) => {
      const version = ++requestVersion.current;
      setReadState('loading');
      try {
        const categories = await client.categories(signal);
        if (version !== requestVersion.current) return;
        setTree(categories);
        setExpanded(parentIds(categories));
        setReadState('ready');
        setFocusAfterRead(focusId ?? null);
      } catch (error) {
        if (version !== requestVersion.current) return;
        const failure = classifyCatalogFailure(error);
        if (failure.kind === 'canceled') return;
        setReadMessage(failure.message);
        setReadState(failure.kind === 'forbidden' ? 'forbidden' : 'error');
        if (failure.kind === 'forbidden') onPermissionDenied();
      }
    },
    [client, onPermissionDenied],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (readState !== 'ready' || focusAfterRead === null) return;
    const target = document.querySelector<HTMLElement>(`[data-category-id="${focusAfterRead}"]`);
    focusLater(target ?? heading.current);
    setFocusAfterRead(null);
  }, [focusAfterRead, readState]);

  useEffect(() => {
    if (canManage) return;
    if (editor) focusLater(editor.opener);
    if (deleting) focusLater(deleting.opener);
    setEditor(null);
    setDeleting(null);
  }, [canManage, deleting, editor]);

  if (readState === 'loading') {
    return (
      <CatalogState
        kind="loading"
        title="در حال دریافت دسته‌بندی‌ها"
        message="ساختار کامل و مرتب دسته‌بندی‌ها در حال دریافت است."
      />
    );
  }
  if (readState === 'error' || readState === 'forbidden') {
    return (
      <CatalogState
        kind={readState === 'forbidden' ? 'forbidden' : 'error'}
        title={readState === 'forbidden' ? 'دسترسی مجاز نیست' : 'دریافت دسته‌بندی‌ها ممکن نشد'}
        message={readMessage}
        {...(readState === 'error' ? { onRetry: () => void load() } : { returnHref: '/' })}
      />
    );
  }

  const createRoot = (opener: HTMLElement) =>
    setEditor({ mode: 'create', parentId: null, opener });
  const handleSaved = (category: CategoryDto) => {
    setEditor(null);
    setAnnouncement(`دسته‌بندی «${category.name}» ذخیره شد.`);
    void load(undefined, category.id);
  };
  const handleDeleted = (category: CategoryDto) => {
    setDeleting(null);
    setAnnouncement(`دسته‌بندی «${category.name}» حذف شد.`);
    void load(undefined, category.parentId);
  };

  return (
    <section className="category-management" aria-labelledby="categories-heading">
      <div className="category-page-heading">
        <div>
          <h1 id="categories-heading" ref={heading} tabIndex={-1}>
            دسته‌بندی‌ها
          </h1>
          <p>ساختار دسته‌بندی‌ها در ترتیب ثبت‌شده در سرور نمایش داده می‌شود.</p>
        </div>
        {canManage ? (
          <button
            className="primary-button"
            type="button"
            onClick={(event) => createRoot(event.currentTarget)}
          >
            افزودن دسته‌بندی
          </button>
        ) : null}
      </div>
      {!canManage ? (
        <p className="permission-note" role="note">
          این ساختار برای حساب شما فقط خواندنی است.
        </p>
      ) : null}
      <p className="category-announcement" aria-live="polite">
        {announcement}
      </p>
      {tree.length === 0 ? (
        <div className="category-empty" role="status">
          <h2>هنوز دسته‌بندی‌ای ثبت نشده است</h2>
          <p>
            {canManage
              ? 'برای آغاز ساختار کاتالوگ، یک دسته‌بندی ریشه اضافه کنید.'
              : 'پس از ثبت دسته‌بندی، ساختار در این صفحه نمایش داده می‌شود.'}
          </p>
        </div>
      ) : (
        <CategoryTree
          tree={tree}
          canManage={canManage}
          expanded={expanded}
          onToggle={(categoryId) =>
            setExpanded((current) => {
              const next = new Set(current);
              if (next.has(categoryId)) next.delete(categoryId);
              else next.add(categoryId);
              return next;
            })
          }
          onCreate={(category, opener) =>
            setEditor({ mode: 'create', parentId: category.id, opener })
          }
          onEdit={(category, opener) =>
            setEditor({ mode: 'edit', category, parentId: category.parentId, opener })
          }
          onDelete={(category, opener) => setDeleting({ category, opener })}
        />
      )}
      {editor ? (
        <CategoryEditorDialog
          state={editor}
          tree={tree}
          client={client}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
          onPermissionDenied={onPermissionDenied}
        />
      ) : null}
      {deleting ? (
        <DeleteCategoryDialog
          state={deleting}
          client={client}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
          onPermissionDenied={onPermissionDenied}
        />
      ) : null}
    </section>
  );
}

export function CategoryManagement() {
  const capabilities = useCatalogCapabilities();
  const { retryBootstrap } = useAuth();
  return (
    <CategoryManagementView
      canManage={capabilities.manage}
      onPermissionDenied={retryBootstrap}
    />
  );
}
