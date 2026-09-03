import { Module } from '@nestjs/common';

import { AuthenticationModule } from '../authentication/authentication.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { CatalogAccessGuard } from './catalog-access.guard.js';
import { CategoryController } from './category.controller.js';
import { CategoryRepository } from './category.repository.js';
import { CategoryService } from './category.service.js';
import { ProductController } from './product.controller.js';
import { ProductRepository } from './product.repository.js';
import { ProductService } from './product.service.js';

@Module({
  imports: [AuthenticationModule, DatabaseModule],
  controllers: [CategoryController, ProductController],
  providers: [
    CatalogAccessGuard,
    CategoryRepository,
    CategoryService,
    ProductRepository,
    ProductService,
  ],
})
export class CatalogModule {}
