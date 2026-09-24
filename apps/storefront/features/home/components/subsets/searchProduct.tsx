import { UiInputTextField } from '@/components/shared/ui-polymorphic-comp';

const SearchProduct = () => {
  return (
    <div className="w-full sm:max-w-md">
      <UiInputTextField
        id="product-search"
        name="query"
        type="text"
        label="جستجوی محصولات"
        placeholder="نام محصول را وارد کنید"
        enterKeyHint="search"
        required
      />
    </div>
  );
};

export default SearchProduct;
