import { Injectable } from '@nestjs/common';

import {
  PRODUCT_STATUS_OPTIONS,
  PUBLIC_PRODUCT_COLOR_OPTIONS,
  PUBLIC_PRODUCT_SIZE_OPTIONS,
  type ProductStatusOptionDto,
  type PublicProductColorOption,
  type PublicProductSizeOption,
} from './product-option.dto.js';

@Injectable()
export class ProductOptionService {
  sizes(): readonly PublicProductSizeOption[] {
    return PUBLIC_PRODUCT_SIZE_OPTIONS;
  }

  colors(): readonly PublicProductColorOption[] {
    return PUBLIC_PRODUCT_COLOR_OPTIONS;
  }

  statuses(): readonly ProductStatusOptionDto[] {
    return PRODUCT_STATUS_OPTIONS;
  }
}
