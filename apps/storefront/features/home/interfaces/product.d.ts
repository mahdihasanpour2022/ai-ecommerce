import { StaticImageData } from 'next/image';

export type Currency = 'IRR' | 'IRT';

export interface Product {
  id: number;
  name: string;
  description: string;
  image: StaticImageData;
  alt: string;
  final_price: number;
  original_price: number;
  discount: number;
  currency: Currency;
}