import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Response type from Service Layer errors
 */
interface ServiceLayerError {
  error: {
    code?: string;
    message: {
      lang?: string;
      value: string;
    };
  };
}

/**
 * Generic Service Layer response for entities with DocEntry
 */
interface DocumentResponse {
  DocEntry?: number;
  [key: string]: unknown;
}

/**
 * ServiceLayerService provides HTTP access to SAP Business One Service Layer.
 *
 * CRITICAL: Use this service for ALL write operations to SAP B1 standard tables.
 * Direct SQL writes to standard tables (OWOR, OIGN, etc.) bypass business logic
 * and void SAP support.
 *
 * Features:
 * - Automatic session management with proactive refresh
 * - Retry-on-401 logic for expired sessions
 * - Typed methods for common operations
 *
 * Session handling:
 * - Sessions expire after ~30 minutes of inactivity
 * - Service proactively refreshes when within 5 minutes of expiry
 * - 401 responses trigger automatic re-login and retry
 *
 * @example
 * // Create goods receipt
 * await serviceLayer.createGoodsReceipt({
 *   DocDate: '2026-01-18',
 *   DocumentLines: [{
 *     ItemCode: 'ITEM001',
 *     Quantity: 100,
 *     WarehouseCode: '03'
 *   }]
 * });
 *
 * // Update UDT record
 * await serviceLayer.updateUDT('MES_WORK_ORDERS', 'WO001', {
 *   U_Status: 'released'
 * });
 */
@Injectable()
export class ServiceLayerService {
  private readonly logger = new Logger(ServiceLayerService.name);
  private readonly baseUrl: string;
  private readonly company: string;
  private readonly username: string;
  private readonly password: string;

  private sessionId: string | null = null;
  private sessionExpiresAt: Date | null = null;

  /** Session timeout in milliseconds (default 30 minutes) */
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  /** Buffer time before expiry to refresh (5 minutes) */
  private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('SL_BASE_URL') || '';
    this.company = this.configService.get<string>('SL_COMPANY') || '';
    this.username = this.configService.get<string>('SL_USERNAME') || '';
    this.password = this.configService.get<string>('SL_PASSWORD') || '';
  }

  /**
   * Login to Service Layer and store session
   */
  async login(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/Login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        CompanyDB: this.company,
        UserName: this.username,
        Password: this.password,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as ServiceLayerError;
      const message = error?.error?.message?.value || 'Login failed';
      this.logger.error(`Service Layer login failed: ${message}`);
      throw new Error(message);
    }

    // Extract session from cookie
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/B1SESSION=([^;]+)/);
      if (match) {
        this.sessionId = match[1];
      }
    }

    // If session wasn't in cookie, try response body
    if (!this.sessionId) {
      const data = (await response.json()) as { SessionId?: string };
      this.sessionId = data.SessionId || null;
    }

    // Set expiry time (30 minutes from now)
    this.sessionExpiresAt = new Date(Date.now() + this.SESSION_TIMEOUT_MS);

    this.logger.log('Service Layer session established');
  }

  /**
   * Ensure we have a valid session, refreshing if needed
   */
  async ensureSession(): Promise<void> {
    // No session - need to login
    if (!this.sessionId || !this.sessionExpiresAt) {
      await this.login();
      return;
    }

    // Check if session is expired or about to expire
    const now = Date.now();
    const expiresAt = this.sessionExpiresAt.getTime();

    if (now >= expiresAt - this.REFRESH_BUFFER_MS) {
      this.logger.debug('Session expired or expiring soon, refreshing');
      await this.login();
    }
  }

  /**
   * Make a request to Service Layer
   *
   * @param method - HTTP method (GET, POST, PATCH, DELETE)
   * @param endpoint - API endpoint (e.g., '/ProductionOrders(1)')
   * @param data - Request body for POST/PATCH
   * @param retryCount - Internal retry counter
   * @returns Response data or null for 204 responses
   */
  async request<T = unknown>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: unknown,
    retryCount = 0
  ): Promise<T | null> {
    await this.ensureSession();

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Cookie: `B1SESSION=${this.sessionId}`,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    // Handle 401 with retry
    if (response.status === 401 && retryCount === 0) {
      this.logger.debug('Session expired, retrying with fresh session');
      this.sessionId = null;
      this.sessionExpiresAt = null;
      return this.request<T>(method, endpoint, data, retryCount + 1);
    }

    if (!response.ok) {
      const error = (await response.json()) as ServiceLayerError;
      const message = error?.error?.message?.value || 'Service Layer request failed';
      this.logger.error(`Service Layer error: ${message}`, {
        method,
        endpoint,
        status: response.status,
      });
      throw new Error(message);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    // Reset session expiry on successful request
    this.sessionExpiresAt = new Date(Date.now() + this.SESSION_TIMEOUT_MS);

    return (await response.json()) as T;
  }

  /**
   * Logout from Service Layer and clear session
   */
  async logout(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    try {
      await this.request('POST', '/Logout');
    } catch (error) {
      this.logger.warn('Logout request failed', error);
    } finally {
      this.sessionId = null;
      this.sessionExpiresAt = null;
      this.logger.log('Service Layer session cleared');
    }
  }

  // ==================== Production Orders ====================

  /**
   * Get a production order by DocEntry
   */
  async getProductionOrder(docEntry: number): Promise<DocumentResponse | null> {
    return this.request<DocumentResponse>('GET', `/ProductionOrders(${docEntry})`);
  }

  /**
   * Create a new production order
   */
  async createProductionOrder(data: unknown): Promise<DocumentResponse> {
    const result = await this.request<DocumentResponse>(
      'POST',
      '/ProductionOrders',
      data
    );
    if (!result) {
      throw new Error('Unexpected empty response from createProductionOrder');
    }
    return result;
  }

  /**
   * Update an existing production order
   */
  async updateProductionOrder(
    docEntry: number,
    data: unknown
  ): Promise<void> {
    await this.request('PATCH', `/ProductionOrders(${docEntry})`, data);
  }

  /**
   * Release a production order
   */
  async releaseProductionOrder(docEntry: number): Promise<void> {
    await this.request('POST', `/ProductionOrders(${docEntry})/Release`);
  }

  // ==================== Inventory Transactions ====================

  /**
   * Create a goods receipt (OIGN)
   *
   * Used for production output - accepted and rejected quantities
   *
   * @example
   * await serviceLayer.createGoodsReceipt({
   *   DocDate: '2026-01-18',
   *   DocumentLines: [{
   *     ItemCode: 'YM00001662',
   *     Quantity: 100,
   *     WarehouseCode: '03',
   *     BatchNumbers: [{
   *       BatchNumber: 'ANS20260118001',
   *       Quantity: 100
   *     }]
   *   }]
   * });
   */
  async createGoodsReceipt(data: unknown): Promise<DocumentResponse> {
    const result = await this.request<DocumentResponse>(
      'POST',
      '/InventoryGenEntries',
      data
    );
    if (!result) {
      throw new Error('Unexpected empty response from createGoodsReceipt');
    }
    return result;
  }

  /**
   * Create a goods issue (OIGE)
   */
  async createGoodsIssue(data: unknown): Promise<DocumentResponse> {
    const result = await this.request<DocumentResponse>(
      'POST',
      '/InventoryGenExits',
      data
    );
    if (!result) {
      throw new Error('Unexpected empty response from createGoodsIssue');
    }
    return result;
  }

  // ==================== User-Defined Tables ====================

  /**
   * Get a UDT record by code
   *
   * @param tableName - Table name WITHOUT the '@' or 'U_' prefix
   * @param code - Record code (primary key)
   */
  async getUDT(tableName: string, code: string): Promise<unknown> {
    return this.request('GET', `/U_${tableName}('${code}')`);
  }

  /**
   * Create a new UDT record
   *
   * @param tableName - Table name WITHOUT the '@' or 'U_' prefix
   * @param data - Record data
   *
   * @example
   * await serviceLayer.createUDT('MES_WORK_ORDERS', {
   *   Code: 'WO001',
   *   Name: 'Work Order 001',
   *   U_Status: 'draft'
   * });
   */
  async createUDT(tableName: string, data: unknown): Promise<unknown> {
    return this.request('POST', `/U_${tableName}`, data);
  }

  /**
   * Update an existing UDT record
   *
   * @param tableName - Table name WITHOUT the '@' or 'U_' prefix
   * @param code - Record code (primary key)
   * @param data - Fields to update
   *
   * @example
   * await serviceLayer.updateUDT('MES_WORK_ORDERS', 'WO001', {
   *   U_Status: 'released'
   * });
   */
  async updateUDT(
    tableName: string,
    code: string,
    data: unknown
  ): Promise<void> {
    await this.request('PATCH', `/U_${tableName}('${code}')`, data);
  }
}
