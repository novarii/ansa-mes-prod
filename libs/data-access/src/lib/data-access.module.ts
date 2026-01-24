import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HanaService } from './hana.service';
import { ServiceLayerService } from './service-layer.service';
import { WorkOrderRepository } from './repositories/work-order.repository';
import { ActivityRepository } from './repositories/activity.repository';
import { ResourceRepository } from './repositories/resource.repository';
import { EmployeeRepository } from './repositories/employee.repository';
import { BreakReasonRepository } from './repositories/break-reason.repository';
import { PickListRepository } from './repositories/pick-list.repository';
import { StockRepository } from './repositories/stock.repository';

/**
 * DataAccessModule provides access to SAP HANA and Service Layer.
 *
 * This module exports:
 * - HanaService: For read operations and direct UDT writes
 * - ServiceLayerService: For writes to SAP B1 standard tables
 * - Repositories: For domain-specific data access patterns
 *
 * Required environment variables:
 * - HANA_HOST, HANA_PORT, HANA_USER, HANA_PASSWORD, HANA_DATABASE
 * - SL_BASE_URL, SL_COMPANY, SL_USERNAME, SL_PASSWORD
 *
 * @example
 * // In your feature module
 * import { Module } from '@nestjs/common';
 * import { DataAccessModule } from '@org/data-access';
 *
 * @Module({
 *   imports: [DataAccessModule],
 * })
 * export class FeatureModule {}
 */
@Module({
  imports: [ConfigModule],
  providers: [
    HanaService,
    ServiceLayerService,
    WorkOrderRepository,
    ActivityRepository,
    ResourceRepository,
    EmployeeRepository,
    BreakReasonRepository,
    PickListRepository,
    StockRepository,
  ],
  exports: [
    HanaService,
    ServiceLayerService,
    WorkOrderRepository,
    ActivityRepository,
    ResourceRepository,
    EmployeeRepository,
    BreakReasonRepository,
    PickListRepository,
    StockRepository,
  ],
})
export class DataAccessModule {}
