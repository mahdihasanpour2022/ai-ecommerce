import { Injectable } from '@nestjs/common';

import {
  PRODUCT_STATUS_OPTIONS,
  PUBLIC_PRODUCT_SIZE_OPTIONS,
  type ProductStatusOptionDto,
  type PublicProductColorOption,
  type PublicProductSizeOption,
} from './product-option.dto.js';
import { ProductOptionError } from './product-option.errors.js';
import { ProductOptionRepository } from './product-option.repository.js';

@Injectable()
export class ProductOptionService {
  constructor(private readonly repository: ProductOptionRepository) {}

  sizes(): readonly PublicProductSizeOption[] {
    return PUBLIC_PRODUCT_SIZE_OPTIONS;
  }

  colors(): Promise<readonly PublicProductColorOption[]> {
    return this.repository.colors();
  }

  async deleteColor(englishName: string): Promise<void> {
    if (!(await this.repository.deleteColor(englishName))) {
      throw new ProductOptionError('PRODUCT_COLOR_NOT_FOUND');
    }
  }

  statuses(): readonly ProductStatusOptionDto[] {
    return PRODUCT_STATUS_OPTIONS;
  }
}
