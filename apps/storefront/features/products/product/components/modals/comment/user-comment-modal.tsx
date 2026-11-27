'use client';

import { Seperator } from '@/components/shared';
import { UiButton, UiHeading, UiImage, UiInputTextarea, UiP, UiSpan } from '@/components/shared/ui';
import { useCustomerAuth } from '@/features/customer-auth/auth-provider';
import {
  USER_COMMENT_MAX_LENGTH,
  userCommentSchema,
  type UserCommentFormInput,
  type UserCommentFormValues,
} from '@/features/products/product/components/modals/comment/user-comment-form';
import {
  hideUserCommentModal,
  type UserCommentModalProps,
} from '@/features/products/product/components/modals/comment/user-comment-modal-controller';
import { validatePlainText } from '@e-commerce/plain-text-security';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { ModalWrapper } from 'reoverlay';
import { toast } from 'sonner';

// پنجره ثبت دیدگاه، focus اولیه، گردش keyboard و بازگشت focus را مدیریت می‌کند.
export function UserCommentModal({ product }: UserCommentModalProps) {
  const { customer, status: authStatus } = useCustomerAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<UserCommentFormInput, unknown, UserCommentFormValues>({
    resolver: zodResolver(userCommentSchema),
    defaultValues: { comment: '' },
  });

  useEffect(() => {
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFocus('comment');

    // گردش Tab را داخل محتوای Modal نگه می‌دارد چون Wrapper پکیج focus trap داخلی ندارد.
    const trapKeyboardFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusableElements = contentRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', trapKeyboardFocus);
    return () => {
      document.removeEventListener('keydown', trapKeyboardFocus);
      triggerRef.current?.focus();
    };
  }, [setFocus]);

  // با از دست رفتن نشست معتبر، اطلاعات مشتری را از سطح مودال خارج می‌کند.
  useEffect(() => {
    if (authStatus !== 'authenticated' || !customer) hideUserCommentModal();
  }, [authStatus, customer]);

  if (authStatus !== 'authenticated' || !customer) return null;

  const customerName = `${customer.firstName} ${customer.lastName}`.trim();

  // متن معتبر فرم را پیش از اتصال آینده به سرویس با سیاست متن ساده بررسی می‌کند.
  const submitComment = ({ comment }: UserCommentFormValues) => {
    const securityResult = validatePlainText(comment);
    if (!securityResult.valid) {
      resetField('comment', { defaultValue: '' });
      toast.error('متن دیدگاه شامل محتوای غیرمجاز است.');
      setFocus('comment');
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('user-comment-submission', {
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
        },
        product: { id: product.id, name: product.name },
        comment: securityResult.value,
      });
    }
    hideUserCommentModal();
  };

  return (
    <ModalWrapper
      aria-labelledby="user-comment-title"
      aria-describedby="user-comment-description"
      animation="zoom"
      wrapperClassName="p-4 sm:p-6"
      contentContainerClassName="border-border bg-surface! text-foreground w-full max-w-xl rounded-2xl border p-4 shadow-lg sm:p-6"
      onClose={hideUserCommentModal}
    >
      <div ref={contentRef} dir="rtl">
        <div className="flex items-center justify-between gap-4">
          <UiHeading id="user-comment-title" type="h2">
            ثبت دیدگاه
          </UiHeading>
          <UiButton
            type="button"
            variant="style_2"
            size="icon"
            className="hover:bg-foreground/10 focus-visible:outline-nice-red w-fit! shrink-0 rounded-lg text-xl focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label="بستن پنجره ثبت دیدگاه"
            onClick={hideUserCommentModal}
          >
            ×
          </UiButton>
        </div>
        <Seperator className="bg-nice-gray my-2! h-1!" />

        <UiP className="" variant="style_7">
          ثبت دیدگاه برای محصول :
        </UiP>

        <div className="flex items-center gap-4 py-4">
          <UiImage
            src={product.image}
            alt=""
            width={80}
            height={80}
            className="h-16! w-16! shrink-0 rounded-xl object-contain"
          />
          <UiSpan variant="style_12" className="">
            {product.name}
          </UiSpan>
        </div>
        <Seperator className="bg-nice-gray mt-2!" />

        <form noValidate onSubmit={(event) => void handleSubmit(submitComment)(event)}>
          <UiInputTextarea
            {...register('comment')}
            containerClassName="mt-6"
            id="user-comment-text"
            label="متن دیدگاه"
            required
            maxLength={USER_COMMENT_MAX_LENGTH}
            errorMessage={errors.comment?.message}
            placeholder="نظر خود را درباره این محصول بنویسید…"
          />

          <div
            className="flex items-center justify-start gap-1 rounded-b-3xl py-4"
            id="user-comment-description"
          >
            <UiSpan className="" variant="style_6">
              ارسال با نام
            </UiSpan>
            <UiSpan className="px-0!" variant="style_7">
              {customerName}
            </UiSpan>
          </div>

          <UiButton
            type="submit"
            size="medium"
            loading={isSubmitting}
            className="bg-nice-red text-white"
          >
            {isSubmitting ? 'در حال بررسی دیدگاه' : 'ارسال دیدگاه'}
          </UiButton>
        </form>
      </div>
    </ModalWrapper>
  );
}
