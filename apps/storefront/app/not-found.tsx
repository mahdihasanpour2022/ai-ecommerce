import { UiButton, UiP, UiSpan } from '@/components/shared/ui';

const PublicNotFound = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center gap-0">
      <div className="flex h-fit w-fit flex-col items-center justify-center gap-4">
        <UiSpan
          variant="style_6"
          className="text-foreground-30! w-full pb-4 text-center text-[100px] font-bold"
        >
          404
        </UiSpan>
        <UiP
          variant="style_1"
          className="text-foreground/30! w-fit! text-center text-sm! font-medium!"
        >
          متاسفانه صفحه ای که به دنبال آن بودید یافت نشد!
        </UiP>
        <UiButton className="w-full text-base" variant="style_5">
          تلاش مجدد
        </UiButton>
      </div>
    </div>
  );
};

export default PublicNotFound;
