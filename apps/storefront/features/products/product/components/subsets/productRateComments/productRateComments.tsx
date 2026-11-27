import { UiButton, UiP, UiSpan } from '@/components/shared/ui';
import { useCustomerAuth } from '@/features/customer-auth/auth-provider';
import { showGuestCommentModal } from '@/features/products/product/components/modals/comment/guest-comment-modal-controller';
import {
  showUserCommentModal,
  type UserCommentProduct,
} from '@/features/products/product/components/modals/comment/user-comment-modal-controller';
import { StarRating } from './starRating';

interface ProductRateCommentsProps {
  readonly product: UserCommentProduct;
}

export const ProductRateComments = ({ product }: ProductRateCommentsProps) => {
  const { status: authStatus } = useCustomerAuth();

  // مهمان را به مسیر ورود هدایت می‌کند و مودال ثبت دیدگاه را فقط برای نشست معتبر باز می‌کند.
  const handleCommentClick = () => {
    if (authStatus === 'anonymous') {
      showGuestCommentModal();
      return;
    }
    if (authStatus !== 'authenticated') return;
    showUserCommentModal({ product });
  };

  return (
    <section className="w-full pt-6 pb-4">
      <h2 className="text-foreground/80 border-nice-red w-fit border-b-2 px-1 pb-1 text-lg font-bold">
        امتیاز و دیدگاه کاربران
      </h2>
      <div className="w-full">
        <div className="w-3/12 py-4">
          <UiP variant="style_1" className="">
            <UiSpan variant="style_10" className="pl-2 text-2xl!">
              4.7
            </UiSpan>
            از 5
          </UiP>
          <div className="flex w-full items-center justify-start gap-2 pt-3 pb-3">
            <StarRating readOnly initialRating={0} />
            <UiSpan variant="style_6" className="text-2xs! font-medium!">
              از مجموع 30 امتیاز
            </UiSpan>
          </div>
          <UiButton
            variant="style_10"
            size="medium"
            className="w-full"
            disabled={authStatus === 'loading' || authStatus === 'unavailable'}
            onClick={handleCommentClick}
          >
            ثبت دیدگاه
          </UiButton>
        </div>
        <div className="w-9/12"></div>
      </div>
    </section>
  );
};
