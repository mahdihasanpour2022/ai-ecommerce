import { Injectable } from '@nestjs/common';

import {
  PRODUCT_COLOR_OPTIONS,
  PRODUCT_SIZE_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
  PUBLIC_PRODUCT_COLOR_OPTIONS,
  PUBLIC_PRODUCT_SIZE_OPTIONS,
  type ProductColorOptionDto,
  type ProductSizeOption,
  type ProductStatusOptionDto,
  type PublicProductColorOption,
  type PublicProductSizeOption,
} from './product-option.dto.js';

@Injectable()
export class ProductOptionService {
  sizes(): readonly ProductSizeOption[] {
    return PRODUCT_SIZE_OPTIONS;
  }

  colors(): readonly ProductColorOptionDto[] {
    return PRODUCT_COLOR_OPTIONS;
  }

  publicColors(): readonly PublicProductColorOption[] {
    return PUBLIC_PRODUCT_COLOR_OPTIONS;
  }

  publicSizes(): readonly PublicProductSizeOption[] {
    return PUBLIC_PRODUCT_SIZE_OPTIONS;
  }

  statuses(): readonly ProductStatusOptionDto[] {
    return PRODUCT_STATUS_OPTIONS;
  }
}
