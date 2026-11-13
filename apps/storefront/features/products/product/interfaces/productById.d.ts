import { Currency } from '@/interfaces/currency';

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
  readonly categoryPath: readonly {
    readonly id: string;
    readonly name: string;
  }[];
  readonly images: readonly {
    readonly id: string;
    readonly url: string;
    readonly width: number;
    readonly height: number;
    readonly mediaType: string;
  }[];
  readonly variants: readonly {
    readonly id: string;
    readonly size: string;
    readonly color: string;
    readonly isAvailable: boolean;
  }[];
}
