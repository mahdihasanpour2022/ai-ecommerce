import { Module } from '@nestjs/common';

import { AuthenticationModule } from '../authentication/authentication.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { CatalogAccessGuard } from './catalog-access.guard.js';
import { CategoryController } from './category.controller.js';
import { CategoryRepository } from './category.repository.js';
import { CategoryService } from './category.service.js';

@Module({
  imports: [AuthenticationModule, DatabaseModule],
  controllers: [CategoryController],
  providers: [CatalogAccessGuard, CategoryRepository, CategoryService],
})
export class CatalogModule {}
