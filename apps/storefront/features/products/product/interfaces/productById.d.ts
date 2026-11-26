import type { Currency } from '@/interfaces/currency';

export interface Colors {
  readonly englishColorName: string;
  readonly persianColorName: string | null;
}
export interface ProductSpecification {
  readonly title: string;
  readonly description: string;
}
export interface Image {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly mediaType: string;
}

export interface Variants {
  readonly id: string;
  readonly size: string | null;
  readonly color: Colors | null;
  readonly isAvailable: boolean;
  readonly image: Image | null;
}

export interface Category {
  readonly id: string;
  readonly name: string;
}
export interface CategoryPath {
  readonly id: string;
  readonly name: string;
}
export interface ProductByID {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: Category;
  readonly image: string;
  readonly alt: string;
  readonly original_price: number;
  readonly final_price: number;
  readonly discount: number;
  readonly currency: Currency;
  readonly quantity: number;
  readonly isAvailable: boolean;
  readonly isFavorite: boolean;
  readonly specifications: readonly ProductSpecification[];
  readonly mainSpecs: readonly ProductSpecification[];
  readonly categoryPath: readonly CategoryPath[];
  readonly variants: readonly Variants[];
}
