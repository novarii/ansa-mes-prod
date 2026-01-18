import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HanaService } from './hana.service';

// Mock connection and pool objects need to be defined before jest.mock
const mockConnection = {
  exec: jest.fn(),
  disconnect: jest.fn(),
};

const mockPool = {
  getConnection: jest.fn(),
  clear: jest.fn(),
};

// Mock the @sap/hana-client module
jest.mock('@sap/hana-client', () => ({
  createPool: jest.fn(() => mockPool),
}));

describe('HanaService', () => {
  let service: HanaService;

  const mockConfig = {
    HANA_HOST: 'localhost',
    HANA_PORT: '30015',
    HANA_USER: 'testuser',
    HANA_PASSWORD: 'testpass',
    HANA_DATABASE: 'testdb',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mock pool to return mock connection via callback
    mockPool.getConnection.mockImplementation(
      (callback: (err: Error | null, conn?: typeof mockConnection) => void) => {
        callback(null, mockConnection);
      }
    );

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => mockConfig],
        }),
      ],
      providers: [HanaService],
    }).compile();

    service = module.get<HanaService>(HanaService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('onModuleInit', () => {
    it('should create connection pool on initialization', async () => {
      const hanaClient = require('@sap/hana-client');

      await service.onModuleInit();

      expect(hanaClient.createPool).toHaveBeenCalledWith({
        host: mockConfig.HANA_HOST,
        port: parseInt(mockConfig.HANA_PORT, 10),
        user: mockConfig.HANA_USER,
        password: mockConfig.HANA_PASSWORD,
        databaseName: mockConfig.HANA_DATABASE,
        poolSize: 10,
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear the connection pool on destroy', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockPool.clear).toHaveBeenCalled();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should execute a query and return results', async () => {
      const mockResults = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
      ];
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      const result = await service.query<{ id: number; name: string }>(
        'SELECT * FROM "TEST_TABLE" WHERE "status" = ?',
        ['active']
      );

      expect(result).toEqual(mockResults);
      expect(mockPool.getConnection).toHaveBeenCalled();
      expect(mockConnection.exec).toHaveBeenCalledWith(
        'SELECT * FROM "TEST_TABLE" WHERE "status" = ?',
        ['active'],
        expect.any(Function)
      );
    });

    it('should execute a query without parameters', async () => {
      const mockResults = [{ count: 100 }];
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      const result = await service.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM "TEST_TABLE"'
      );

      expect(result).toEqual(mockResults);
      expect(mockConnection.exec).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM "TEST_TABLE"',
        [],
        expect.any(Function)
      );
    });

    it('should handle query errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(mockError, null);
      });

      await expect(
        service.query('SELECT * FROM "INVALID_TABLE"')
      ).rejects.toThrow('Database connection failed');
    });

    it('should release connection back to pool after successful query', async () => {
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await service.query('SELECT 1');

      // Connection should be released via disconnect
      expect(mockConnection.disconnect).toHaveBeenCalled();
    });

    it('should release connection back to pool after failed query', async () => {
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(new Error('Query failed'), null);
      });

      await expect(service.query('SELECT 1')).rejects.toThrow();

      // Connection should still be released
      expect(mockConnection.disconnect).toHaveBeenCalled();
    });

    it('should return empty array for no results', async () => {
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const result = await service.query('SELECT * FROM "EMPTY_TABLE"');

      expect(result).toEqual([]);
    });
  });

  describe('queryOne', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return the first result when results exist', async () => {
      const mockResults = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
      ];
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      const result = await service.queryOne<{ id: number; name: string }>(
        'SELECT * FROM "TEST_TABLE" WHERE "id" = ?',
        [1]
      );

      expect(result).toEqual({ id: 1, name: 'Test 1' });
    });

    it('should return null when no results', async () => {
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const result = await service.queryOne(
        'SELECT * FROM "TEST_TABLE" WHERE "id" = ?',
        [999]
      );

      expect(result).toBeNull();
    });

    it('should handle query errors gracefully', async () => {
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(new Error('Query failed'), null);
      });

      await expect(
        service.queryOne('SELECT * FROM "INVALID_TABLE"')
      ).rejects.toThrow('Query failed');
    });
  });

  describe('execute (for inserts/updates)', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should execute INSERT statement', async () => {
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(null, { affectedRows: 1 });
      });

      const result = await service.execute(
        'INSERT INTO "@ATELIERATTN" ("Code", "Name", "U_EmpId") VALUES (?, ?, ?)',
        ['ATT001', 'Activity 1', '123']
      );

      expect(result).toEqual({ affectedRows: 1 });
    });

    it('should execute UPDATE statement', async () => {
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(null, { affectedRows: 5 });
      });

      const result = await service.execute(
        'UPDATE "@ATELIERATTN" SET "U_Status" = ? WHERE "U_EmpId" = ?',
        ['completed', '123']
      );

      expect(result).toEqual({ affectedRows: 5 });
    });

    it('should handle execute errors gracefully', async () => {
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(new Error('Insert failed'), null);
      });

      await expect(
        service.execute('INSERT INTO "@INVALID" VALUES (?)', ['test'])
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('connection pool behavior', () => {
    it('should throw error when query called before init', async () => {
      // Service not initialized, pool is undefined
      await expect(service.query('SELECT 1')).rejects.toThrow(
        'HanaService not initialized'
      );
    });

    it('should handle connection acquisition failure', async () => {
      await service.onModuleInit();

      mockPool.getConnection.mockImplementationOnce(
        (callback: (err: Error | null, conn?: typeof mockConnection) => void) => {
          callback(new Error('Pool exhausted'));
        }
      );

      await expect(service.query('SELECT 1')).rejects.toThrow('Pool exhausted');
    });
  });

  describe('parameterized queries', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should properly pass multiple parameters', async () => {
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await service.query(
        'SELECT * FROM "TABLE" WHERE "col1" = ? AND "col2" = ? AND "col3" = ?',
        ['value1', 123, true]
      );

      expect(mockConnection.exec).toHaveBeenCalledWith(
        'SELECT * FROM "TABLE" WHERE "col1" = ? AND "col2" = ? AND "col3" = ?',
        ['value1', 123, true],
        expect.any(Function)
      );
    });

    it('should handle null parameters', async () => {
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await service.query('SELECT * FROM "TABLE" WHERE "col" = ?', [null]);

      expect(mockConnection.exec).toHaveBeenCalledWith(
        'SELECT * FROM "TABLE" WHERE "col" = ?',
        [null],
        expect.any(Function)
      );
    });

    it('should handle date parameters', async () => {
      mockConnection.exec.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const date = new Date('2026-01-18T10:00:00Z');
      await service.query('SELECT * FROM "TABLE" WHERE "date" >= ?', [date]);

      expect(mockConnection.exec).toHaveBeenCalledWith(
        'SELECT * FROM "TABLE" WHERE "date" >= ?',
        [date],
        expect.any(Function)
      );
    });
  });
});
