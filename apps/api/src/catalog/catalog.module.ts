import { Module } from '@nestjs/common';

import { AuthenticationModule } from '../authentication/authentication.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { CatalogAccessGuard } from './catalog-access.guard.js';
import { CategoryController } from './category.controller.js';
import { CategoryRepository } from './category.repository.js';
import { CategoryService } from './category.service.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryRepository } from './inventory.repository.js';
import { InventoryService } from './inventory.service.js';
import { ProductController } from './product.controller.js';
import { ProductRepository } from './product.repository.js';
import { ProductService } from './product.service.js';
import {
  AdminPriceDisplaySettingController,
  PublicPriceDisplaySettingController,
} from './price-display-setting.controller.js';
import { PriceDisplaySettingRepository } from './price-display-setting.repository.js';
import { PriceDisplaySettingService } from './price-display-setting.service.js';

@Module({
  imports: [AuthenticationModule, DatabaseModule],
  controllers: [
    CategoryController,
    ProductController,
    InventoryController,
    AdminPriceDisplaySettingController,
    PublicPriceDisplaySettingController,
  ],
  providers: [
    CatalogAccessGuard,
    CategoryRepository,
    CategoryService,
    InventoryRepository,
    InventoryService,
    ProductRepository,
    ProductService,
    PriceDisplaySettingRepository,
    PriceDisplaySettingService,
  ],
})
export class CatalogModule {}
