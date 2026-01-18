import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ServiceLayerService } from './service-layer.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ServiceLayerService', () => {
  let service: ServiceLayerService;

  const mockConfig = {
    SL_BASE_URL: 'https://localhost:50000/b1s/v2',
    SL_COMPANY: 'TESTDB',
    SL_USERNAME: 'manager',
    SL_PASSWORD: 'testpass',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => mockConfig],
        }),
      ],
      providers: [ServiceLayerService],
    }).compile();

    service = module.get<ServiceLayerService>(ServiceLayerService);
  });

  describe('login', () => {
    it('should successfully login and store session', async () => {
      const mockSessionId = 'B1SESSION:abc123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) =>
            name === 'set-cookie' ? `B1SESSION=${mockSessionId}; Path=/` : null,
        },
        json: async () => ({ SessionId: mockSessionId }),
      });

      await service.login();

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.SL_BASE_URL}/Login`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            CompanyDB: mockConfig.SL_COMPANY,
            UserName: mockConfig.SL_USERNAME,
            Password: mockConfig.SL_PASSWORD,
          }),
        })
      );
    });

    it('should throw error on login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: { value: 'Invalid credentials' } },
        }),
      });

      await expect(service.login()).rejects.toThrow('Invalid credentials');
    });

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.login()).rejects.toThrow('Network error');
    });
  });

  describe('ensureSession', () => {
    it('should login if no session exists', async () => {
      const mockSessionId = 'B1SESSION:abc123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => `B1SESSION=${mockSessionId}; Path=/`,
        },
        json: async () => ({ SessionId: mockSessionId }),
      });

      await service.ensureSession();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/Login'),
        expect.any(Object)
      );
    });

    it('should refresh session if expired', async () => {
      // First login
      const mockSessionId = 'B1SESSION:abc123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => `B1SESSION=${mockSessionId}; Path=/`,
        },
        json: async () => ({ SessionId: mockSessionId }),
      });

      await service.login();
      mockFetch.mockClear();

      // Simulate session expiry by directly manipulating internal state
      service['sessionExpiresAt'] = new Date(Date.now() - 1000);

      // Should trigger re-login
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => `B1SESSION=newSession; Path=/`,
        },
        json: async () => ({ SessionId: 'newSession' }),
      });

      await service.ensureSession();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/Login'),
        expect.any(Object)
      );
    });

    it('should not login if session is still valid', async () => {
      // First login
      const mockSessionId = 'B1SESSION:abc123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => `B1SESSION=${mockSessionId}; Path=/`,
        },
        json: async () => ({ SessionId: mockSessionId }),
      });

      await service.login();
      mockFetch.mockClear();

      // Session should still be valid
      await service.ensureSession();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('request', () => {
    beforeEach(async () => {
      // Setup initial session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => `B1SESSION=session123; Path=/`,
        },
        json: async () => ({ SessionId: 'session123' }),
      });
      await service.login();
      mockFetch.mockClear();
    });

    it('should make GET request with session cookie', async () => {
      const mockData = { DocEntry: 1, ItemCode: 'TEST' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.request('GET', '/ProductionOrders(1)');

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.SL_BASE_URL}/ProductionOrders(1)`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Cookie: 'B1SESSION=session123',
          }),
        })
      );
      expect(result).toEqual(mockData);
    });

    it('should make POST request with body', async () => {
      const requestData = { ItemNo: 'TEST', PlannedQuantity: 100 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ DocEntry: 1, ...requestData }),
      });

      await service.request('POST', '/ProductionOrders', requestData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.SL_BASE_URL}/ProductionOrders`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Cookie: 'B1SESSION=session123',
          }),
          body: JSON.stringify(requestData),
        })
      );
    });

    it('should make PATCH request with body', async () => {
      const updateData = { Status: 'R' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.request('PATCH', '/ProductionOrders(1)', updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateData),
        })
      );
    });

    it('should retry on 401 with fresh session', async () => {
      // First request returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: { value: 'Session expired' } } }),
      });

      // Re-login succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => `B1SESSION=newSession; Path=/`,
        },
        json: async () => ({ SessionId: 'newSession' }),
      });

      // Retry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ DocEntry: 1 }),
      });

      const result = await service.request('GET', '/ProductionOrders(1)');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ DocEntry: 1 });
    });

    it('should throw error on non-401 failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: { value: 'Invalid request' } },
        }),
      });

      await expect(
        service.request('POST', '/ProductionOrders', {})
      ).rejects.toThrow('Invalid request');
    });

    it('should handle 204 No Content response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error('No content');
        },
      });

      const result = await service.request('DELETE', '/ProductionOrders(1)');

      expect(result).toBeNull();
    });
  });

  describe('createGoodsReceipt', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => `B1SESSION=session123; Path=/` },
        json: async () => ({ SessionId: 'session123' }),
      });
      await service.login();
      mockFetch.mockClear();
    });

    it('should create goods receipt via Service Layer', async () => {
      const receiptData = {
        DocDate: '2026-01-18',
        DocumentLines: [
          {
            ItemCode: 'YM00001662',
            Quantity: 100,
            WarehouseCode: '03',
            BatchNumbers: [{ BatchNumber: 'ANS20260118001', Quantity: 100 }],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ DocEntry: 999, ...receiptData }),
      });

      const result = await service.createGoodsReceipt(receiptData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.SL_BASE_URL}/InventoryGenEntries`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(receiptData),
        })
      );
      expect(result.DocEntry).toBe(999);
    });
  });

  describe('createUDT', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => `B1SESSION=session123; Path=/` },
        json: async () => ({ SessionId: 'session123' }),
      });
      await service.login();
      mockFetch.mockClear();
    });

    it('should create UDT record', async () => {
      const udtData = {
        Code: 'WO001',
        Name: 'Work Order 001',
        U_Status: 'draft',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => udtData,
      });

      const result = await service.createUDT('MES_WORK_ORDERS', udtData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.SL_BASE_URL}/U_MES_WORK_ORDERS`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(udtData),
        })
      );
      expect(result).toEqual(udtData);
    });
  });

  describe('updateUDT', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => `B1SESSION=session123; Path=/` },
        json: async () => ({ SessionId: 'session123' }),
      });
      await service.login();
      mockFetch.mockClear();
    });

    it('should update UDT record by code', async () => {
      const updateData = { U_Status: 'released' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error('No content');
        },
      });

      await service.updateUDT('MES_WORK_ORDERS', 'WO001', updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.SL_BASE_URL}/U_MES_WORK_ORDERS('WO001')`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateData),
        })
      );
    });
  });

  describe('getProductionOrder', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => `B1SESSION=session123; Path=/` },
        json: async () => ({ SessionId: 'session123' }),
      });
      await service.login();
      mockFetch.mockClear();
    });

    it('should get production order by DocEntry', async () => {
      const mockOrder = {
        DocEntry: 123,
        ItemNo: 'ITEM001',
        PlannedQuantity: 100,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      });

      const result = await service.getProductionOrder(123);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.SL_BASE_URL}/ProductionOrders(123)`,
        expect.any(Object)
      );
      expect(result).toEqual(mockOrder);
    });
  });

  describe('createProductionOrder', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => `B1SESSION=session123; Path=/` },
        json: async () => ({ SessionId: 'session123' }),
      });
      await service.login();
      mockFetch.mockClear();
    });

    it('should create production order', async () => {
      const orderData = {
        ItemNo: 'ITEM001',
        PlannedQuantity: 100,
        DueDate: '2026-02-01',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ DocEntry: 456, ...orderData }),
      });

      const result = await service.createProductionOrder(orderData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.SL_BASE_URL}/ProductionOrders`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(orderData),
        })
      );
      expect(result.DocEntry).toBe(456);
    });
  });

  describe('updateProductionOrder', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => `B1SESSION=session123; Path=/` },
        json: async () => ({ SessionId: 'session123' }),
      });
      await service.login();
      mockFetch.mockClear();
    });

    it('should update production order', async () => {
      const updateData = { Remarks: 'Updated remarks' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error('No content');
        },
      });

      await service.updateProductionOrder(123, updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.SL_BASE_URL}/ProductionOrders(123)`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateData),
        })
      );
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => `B1SESSION=session123; Path=/` },
        json: async () => ({ SessionId: 'session123' }),
      });
      await service.login();
      mockFetch.mockClear();
    });

    it('should call logout endpoint and clear session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error('No content');
        },
      });

      await service.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.SL_BASE_URL}/Logout`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => `B1SESSION=session123; Path=/` },
        json: async () => ({ SessionId: 'session123' }),
      });
      await service.login();
      mockFetch.mockClear();
    });

    it('should handle Service Layer error response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: '-5002',
            message: {
              lang: 'en-us',
              value: 'Item code not found',
            },
          },
        }),
      });

      await expect(
        service.request('POST', '/ProductionOrders', {})
      ).rejects.toThrow('Item code not found');
    });

    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(
        service.request('GET', '/ProductionOrders(1)')
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('session management edge cases', () => {
    it('should proactively refresh before timeout', async () => {
      // Initial login
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => `B1SESSION=session123; Path=/` },
        json: async () => ({ SessionId: 'session123' }),
      });
      await service.login();
      mockFetch.mockClear();

      // Set session to expire in 4 minutes (less than 5 minute buffer)
      service['sessionExpiresAt'] = new Date(Date.now() + 4 * 60 * 1000);

      // New login for refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => `B1SESSION=newSession; Path=/` },
        json: async () => ({ SessionId: 'newSession' }),
      });

      await service.ensureSession();

      // Should have re-logged in due to buffer time
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/Login'),
        expect.any(Object)
      );
    });
  });
});
