import { UiButton, UiP } from '@/components/shared/ui';
import { ColorFilter } from './filters/colorFilter';

interface CollectionFiltersSidebarProps {
  readonly selectedColor: string | undefined;
  readonly onColorSelect: (color: string) => void;
  readonly onClear: () => void;
}

export const CollectionFiltersSidebar = ({
  selectedColor,
  onColorSelect,
  onClear,
}: CollectionFiltersSidebarProps) => {
  return (
    <aside className="border-foreground/20 flex h-fit w-full flex-col items-start justify-center rounded-xl border px-6 pt-4 pb-2 sm:sticky sm:top-6 sm:max-w-80 sm:min-w-80">
      <div className="border-foreground/20 flex w-full items-center justify-between gap-1 border-b pb-1">
        <UiP className="w-fit" variant="style_5">
          فیلترها
        </UiP>
        <UiButton
          className="text-sm!"
          variant="style_6"
          disabled={!selectedColor}
          onClick={onClear}
        >
          حذف فیلترها
        </UiButton>
      </div>

      <ColorFilter selectedColor={selectedColor} onSelect={onColorSelect} />
    </aside>
  );
};
