import AddCategory from '@/features/categories/components/add-category';
import Categories from '@/features/categories/components/categories';

const CategoriesPage = () => {
  return (
    <div className='relative pt-2 h-full'>
      <AddCategory />
      <Categories />
    </div>
  );
};

export default CategoriesPage;
