import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as hanaClient from '@sap/hana-client';

/**
 * Result type for execute operations (INSERT, UPDATE, DELETE)
 */
export interface ExecuteResult {
  affectedRows?: number;
}

/**
 * Type for query parameters - allows common JS types
 * that map to HANA parameter types
 */
export type QueryParam = null | undefined | number | boolean | string | Buffer | Date;

/**
 * HanaService provides read-only access to SAP HANA database.
 *
 * IMPORTANT: Use this service for read operations (SELECT) and
 * direct writes to User-Defined Tables (@tables). For writes to
 * SAP Business One standard tables, use ServiceLayerService instead.
 *
 * Features:
 * - Connection pooling for efficient connection management
 * - Parameterized queries to prevent SQL injection
 * - Automatic connection release back to pool
 *
 * @example
 * // Simple query
 * const orders = await hanaService.query<WorkOrder>(
 *   'SELECT * FROM "OWOR" WHERE "Status" = ?',
 *   ['R']
 * );
 *
 * // Query returning single result
 * const order = await hanaService.queryOne<WorkOrder>(
 *   'SELECT * FROM "OWOR" WHERE "DocEntry" = ?',
 *   [123]
 * );
 *
 * // Direct insert to UDT
 * await hanaService.execute(
 *   'INSERT INTO "@ATELIERATTN" ("Code", "Name") VALUES (?, ?)',
 *   ['ATT001', 'Activity']
 * );
 */
@Injectable()
export class HanaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HanaService.name);
  private pool: hanaClient.ConnectionPool | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Schema to use for queries (set via HANA_SCHEMA env var)
   */
  private schema: string | undefined;

  /**
   * Initialize connection pool on module startup
   */
  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('HANA_HOST');
    const port = this.configService.get<number>('HANA_PORT');
    const user = this.configService.get<string>('HANA_USER');
    const password = this.configService.get<string>('HANA_PASSWORD');
    const databaseName = this.configService.get<string>('HANA_DATABASE');
    this.schema = this.configService.get<string>('HANA_SCHEMA');

    this.pool = hanaClient.createPool({
      host,
      port: typeof port === 'string' ? parseInt(port, 10) : port,
      user,
      password,
      databaseName,
      poolSize: 10,
    });

    this.logger.log(
      `HANA connection pool initialized${this.schema ? ` (schema: ${this.schema})` : ''}`
    );
  }

  /**
   * Clean up connection pool on module shutdown
   */
  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      this.pool.clear();
      this.pool = null;
      this.logger.log('HANA connection pool cleared');
    }
  }

  /**
   * Execute a SELECT query and return all results
   *
   * @param sql - SQL query with parameterized placeholders (?)
   * @param params - Array of parameter values (never interpolate user input!)
   * @returns Array of results typed as T
   *
   * @example
   * const orders = await hanaService.query<WorkOrder>(
   *   `SELECT "DocEntry", "DocNum", "ItemCode"
   *    FROM "OWOR"
   *    WHERE "Status" = ? AND "CardCode" = ?`,
   *   ['R', 'C001']
   * );
   */
  async query<T>(sql: string, params: QueryParam[] = []): Promise<T[]> {
    if (!this.pool) {
      throw new Error('HanaService not initialized');
    }

    const connection = await this.getConnectionFromPool();

    try {
      return await this.executeQuery<T[]>(
        connection,
        sql,
        params as hanaClient.HanaParameterType[]
      );
    } finally {
      connection.disconnect();
    }
  }

  /**
   * Execute a SELECT query and return the first result or null
   *
   * @param sql - SQL query with parameterized placeholders (?)
   * @param params - Array of parameter values
   * @returns First result typed as T, or null if no results
   *
   * @example
   * const order = await hanaService.queryOne<WorkOrder>(
   *   'SELECT * FROM "OWOR" WHERE "DocEntry" = ?',
   *   [123]
   * );
   * if (!order) {
   *   throw new NotFoundException('Work order not found');
   * }
   */
  async queryOne<T>(sql: string, params: QueryParam[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE statement
   *
   * IMPORTANT: Only use this for User-Defined Tables (@tables).
   * For SAP B1 standard tables, use ServiceLayerService.
   *
   * @param sql - SQL statement with parameterized placeholders (?)
   * @param params - Array of parameter values
   * @returns Execute result with affected rows count
   *
   * @example
   * // Insert activity record to UDT
   * await hanaService.execute(
   *   `INSERT INTO "@ATELIERATTN"
   *    ("Code", "Name", "U_WorkOrder", "U_EmpId", "U_ProcType")
   *    VALUES (?, ?, ?, ?, ?)`,
   *   ['ATT001', 'Start Work', 12345, '100', 'BAS']
   * );
   */
  async execute(sql: string, params: QueryParam[] = []): Promise<ExecuteResult> {
    if (!this.pool) {
      throw new Error('HanaService not initialized');
    }

    const connection = await this.getConnectionFromPool();

    try {
      return await this.executeQuery<ExecuteResult>(
        connection,
        sql,
        params as hanaClient.HanaParameterType[]
      );
    } finally {
      connection.disconnect();
    }
  }

  /** Default timeout for getting a connection from pool (ms) */
  private readonly POOL_TIMEOUT_MS = 10000;
  /** Default timeout for query execution (ms) */
  private readonly QUERY_TIMEOUT_MS = 30000;

  /**
   * Internal helper to get a connection from the pool with promise interface
   * Sets the schema if HANA_SCHEMA is configured
   */
  private async getConnectionFromPool(): Promise<hanaClient.Connection> {
    const connection = await new Promise<hanaClient.Connection>((resolve, reject) => {
      if (!this.pool) {
        reject(new Error('Pool not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Pool connection timeout after ${this.POOL_TIMEOUT_MS}ms`));
      }, this.POOL_TIMEOUT_MS);

      this.pool.getConnection((err: Error, conn?: hanaClient.Connection) => {
        clearTimeout(timeout);
        if (err) {
          reject(err);
        } else if (!conn) {
          reject(new Error('Connection not returned from pool'));
        } else {
          resolve(conn);
        }
      });
    });

    // Set schema if configured
    if (this.schema) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          connection.disconnect();
          reject(new Error(`SET SCHEMA timeout after ${this.QUERY_TIMEOUT_MS}ms`));
        }, this.QUERY_TIMEOUT_MS);

        connection.exec(`SET SCHEMA "${this.schema}"`, [], (err: Error) => {
          clearTimeout(timeout);
          if (err) {
            connection.disconnect();
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    return connection;
  }

  /**
   * Internal helper to execute a query with proper callback handling
   */
  private executeQuery<T>(
    connection: hanaClient.Connection,
    sql: string,
    params: hanaClient.HanaParameterType[]
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.logger.error(`Query timeout after ${this.QUERY_TIMEOUT_MS}ms: ${sql.substring(0, 100)}...`);
        reject(new Error(`Query timeout after ${this.QUERY_TIMEOUT_MS}ms`));
      }, this.QUERY_TIMEOUT_MS);

      connection.exec<T>(sql, params, (err: Error, result?: T) => {
        clearTimeout(timeout);
        if (err) {
          this.logger.error(`Query failed: ${err.message}`, err.stack);
          reject(err);
        } else {
          resolve(result as T);
        }
      });
    });
  }
}
