import { Module } from '@nestjs/common';

import { CustomerAuthenticationModule } from '../customer-authentication/customer-authentication.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { FavoriteController } from './favorite.controller.js';
import { FavoriteRepository } from './favorite.repository.js';
import { FavoriteService } from './favorite.service.js';

@Module({
  imports: [CustomerAuthenticationModule, DatabaseModule],
  controllers: [FavoriteController],
  providers: [FavoriteRepository, FavoriteService],
})
export class FavoriteModule {}
