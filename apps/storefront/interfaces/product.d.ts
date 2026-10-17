export type Currency = 'IRR' | 'IRT';

export interface Product {
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
  readonly currency: string;
  readonly quantity: number;
  readonly isAvailable: boolean;
}
