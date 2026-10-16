import { Module } from '@nestjs/common';

import { AuthenticationModule } from '../authentication/authentication.module.js';
import { DatabaseModule } from '../database/database.module.js';
import {
  BannerController,
  BannerImageMultipartErrorInterceptor,
  PublicBannerController,
} from './banner.controller.js';
import { BannerRepository } from './banner.repository.js';
import { BannerService } from './banner.service.js';
import { CatalogAccessGuard } from './catalog-access.guard.js';
import { CategoryController } from './category.controller.js';
import {
  CategoryImageController,
  PublicCategoryImageController,
} from './category-image.controller.js';
import { CategoryRepository } from './category.repository.js';
import { CategoryService } from './category.service.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryRepository } from './inventory.repository.js';
import { InventoryService } from './inventory.service.js';
import { ProductController } from './product.controller.js';
import { ProductOptionController } from './product-option.controller.js';
import { ProductOptionService } from './product-option.service.js';
import { ProductRepository } from './product.repository.js';
import { ProductService } from './product.service.js';
import {
  AdminPriceDisplaySettingController,
  PublicPriceDisplaySettingController,
} from './price-display-setting.controller.js';
import { PriceDisplaySettingRepository } from './price-display-setting.repository.js';
import { PriceDisplaySettingService } from './price-display-setting.service.js';
import {
  AdminProductImageController,
  ProductImageMultipartErrorInterceptor,
  PublicProductImageController,
} from './product-image.controller.js';
import { ProductImageRepository } from './product-image.repository.js';
import { ProductImageService } from './product-image.service.js';
import { ProductImageStorage } from './product-image.storage.js';
import { ProductImageValidator } from './product-image.validation.js';
import { PublicCatalogController } from './public-catalog.controller.js';
import { PublicCatalogRepository } from './public-catalog.repository.js';
import { PublicCatalogService } from './public-catalog.service.js';

@Module({
  imports: [AuthenticationModule, DatabaseModule],
  controllers: [
    BannerController,
    PublicBannerController,
    CategoryController,
    CategoryImageController,
    PublicCategoryImageController,
    ProductController,
    ProductOptionController,
    InventoryController,
    AdminPriceDisplaySettingController,
    PublicPriceDisplaySettingController,
    AdminProductImageController,
    PublicProductImageController,
    PublicCatalogController,
  ],
  providers: [
    BannerImageMultipartErrorInterceptor,
    BannerRepository,
    BannerService,
    CatalogAccessGuard,
    CategoryRepository,
    CategoryService,
    InventoryRepository,
    InventoryService,
    ProductRepository,
    ProductService,
    ProductOptionService,
    PriceDisplaySettingRepository,
    PriceDisplaySettingService,
    ProductImageMultipartErrorInterceptor,
    ProductImageRepository,
    ProductImageService,
    ProductImageStorage,
    ProductImageValidator,
    PublicCatalogRepository,
    PublicCatalogService,
  ],
})
export class CatalogModule {}
