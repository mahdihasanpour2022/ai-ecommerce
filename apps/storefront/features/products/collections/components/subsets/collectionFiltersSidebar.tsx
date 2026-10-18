import { UiButton, UiP } from '@/components/shared/ui';
import { ColorFilter } from './colorFilter';

export const CollectionFiltersSidebar = () => {
  return (
    <aside className="border-foreground/20 sticky top-6 hidden h-fit max-w-80 min-w-80 flex-col items-start justify-center rounded-xl border px-6 pt-4 pb-2 sm:flex">
      <div className="border-foreground/20 flex w-full items-center justify-between gap-1 border-b pb-1">
        <UiP className="w-fit" variant="style_5">
          فیلترها
        </UiP>
        <UiButton className="text-sm!" variant="style_6">
          حذف فیلترها
        </UiButton>
      </div>

      <ColorFilter />
    </aside>
  );
};
