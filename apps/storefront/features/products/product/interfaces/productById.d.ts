import type { Currency } from '@/interfaces/currency';

export interface Colors {
  readonly englishColorName: string;
  readonly persianColorName: string | null;
}
export interface ProductSpecification {
  readonly title: string;
  readonly description: string;
}

export interface Variants {
  readonly id: string;
  readonly size: string | null;
  readonly color: Colors | null;
  readonly isAvailable: boolean;
  readonly image: {
    readonly id: string;
    readonly url: string;
    readonly width: number;
    readonly height: number;
    readonly mediaType: string;
  } | null;
}

export interface ProductByID {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: {
    readonly id: string;
    readonly name: string;
  };
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
  readonly categoryPath: readonly {
    readonly id: string;
    readonly name: string;
  }[];
  readonly variants: readonly Variants[];
}
