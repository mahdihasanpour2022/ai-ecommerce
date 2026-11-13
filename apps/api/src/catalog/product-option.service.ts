import { Injectable } from '@nestjs/common';

import {
  PRODUCT_STATUS_OPTIONS,
  type ProductStatusOptionDto,
  type ProductColorInput,
  type ProductSizeInput,
  type PublicProductColorOption,
  type PublicProductSizeOption,
} from './product-option.dto.js';
import {
  mapProductOptionPersistenceError,
  mapProductSizeOptionPersistenceError,
  ProductOptionError,
} from './product-option.errors.js';
import { ProductOptionRepository } from './product-option.repository.js';

@Injectable()
export class ProductOptionService {
  constructor(private readonly repository: ProductOptionRepository) {}

  sizes(): Promise<readonly PublicProductSizeOption[]> {
    return this.repository.sizes();
  }

  colors(): Promise<readonly PublicProductColorOption[]> {
    return this.repository.colors();
  }

  async createColor(input: ProductColorInput): Promise<PublicProductColorOption> {
    try {
      return await this.repository.createColor(input);
    } catch (error) {
      throw mapProductOptionPersistenceError(error) ?? error;
    }
  }

  async updateColor(
    currentEnglishName: string,
    input: ProductColorInput,
  ): Promise<PublicProductColorOption> {
    try {
      return await this.repository.updateColor(currentEnglishName, input);
    } catch (error) {
      throw mapProductOptionPersistenceError(error) ?? error;
    }
  }

  async deleteColor(englishName: string): Promise<void> {
    if (!(await this.repository.deleteColor(englishName))) {
      throw new ProductOptionError('PRODUCT_COLOR_NOT_FOUND');
    }
  }

  async createSize(input: ProductSizeInput): Promise<PublicProductSizeOption> {
    try {
      return await this.repository.createSize(input);
    } catch (error) {
      throw mapProductSizeOptionPersistenceError(error) ?? error;
    }
  }

  async updateSize(
    currentEnglishName: string,
    input: ProductSizeInput,
  ): Promise<PublicProductSizeOption> {
    try {
      return await this.repository.updateSize(currentEnglishName, input);
    } catch (error) {
      throw mapProductSizeOptionPersistenceError(error) ?? error;
    }
  }

  async deleteSize(englishName: string): Promise<void> {
    if (!(await this.repository.deleteSize(englishName))) {
      throw new ProductOptionError('PRODUCT_SIZE_NOT_FOUND');
    }
  }

  statuses(): readonly ProductStatusOptionDto[] {
    return PRODUCT_STATUS_OPTIONS;
  }
}
