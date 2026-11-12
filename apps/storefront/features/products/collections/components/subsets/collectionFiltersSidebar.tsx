import { UiButton, UiP } from '@/components/shared/ui';
import { useProductFilters } from '../../hooks/useProductFilters';
import { ColorFilter } from './filters/colorFilter';
import SizeFilter from './filters/sizeFilter';

export const CollectionFiltersSidebar = () => {
  const {
    selectedColor,
    selectedSize,
    setColor,
    setSize,
    clearColor,
    clearSize,
    clearAll,
  } = useProductFilters();

  return (
    <aside className="border-foreground/20 flex h-fit w-full flex-col items-start justify-center rounded-xl border px-6 pt-4 pb-2 sm:sticky sm:top-6 sm:max-w-80 sm:min-w-80">
      <div className="border-foreground/20 flex w-full items-center justify-between gap-1 border-b pb-1">
        <UiP className="w-fit" variant="style_5">
          فیلترها
        </UiP>
        <UiButton
          className="text-sm!"
          variant="style_6"
          disabled={!selectedColor && !selectedSize}
          onClick={clearAll}
        >
          حذف فیلترها
        </UiButton>
      </div>

      <ColorFilter
        selectedColor={selectedColor}
        onSelect={setColor}
        onClear={clearColor}
      />
      <SizeFilter selectedSize={selectedSize} onSelect={setSize} onClear={clearSize} />
    </aside>
  );
};
