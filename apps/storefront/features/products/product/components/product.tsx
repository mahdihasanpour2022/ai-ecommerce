'use client';

import { useGetProductById } from '../hooks/useGetProductById';

interface ProductProps {
  readonly productId: string;
}

export const Product = ({ productId }: ProductProps) => {
  const { data } = useGetProductById({ productId });
  console.log('data ===>', data);

  return <div className="">here is product</div>;
};

 
