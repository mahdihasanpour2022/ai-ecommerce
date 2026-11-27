import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { OrderRepository } from './order.repository.js';
import { PurchaseEligibilityService } from './purchase-eligibility.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [OrderRepository, PurchaseEligibilityService],
  exports: [PurchaseEligibilityService],
})
export class OrderModule {}
