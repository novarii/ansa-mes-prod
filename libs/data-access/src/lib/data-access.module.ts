import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HanaService } from './hana.service';
import { ServiceLayerService } from './service-layer.service';

/**
 * DataAccessModule provides access to SAP HANA and Service Layer.
 *
 * This module exports two services:
 * - HanaService: For read operations and direct UDT writes
 * - ServiceLayerService: For writes to SAP B1 standard tables
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
  providers: [HanaService, ServiceLayerService],
  exports: [HanaService, ServiceLayerService],
})
export class DataAccessModule {}
