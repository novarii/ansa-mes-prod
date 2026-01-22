import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { EmployeeRepository, ResourceRepository } from '@org/data-access';
import type {
  LoginResponse,
  AuthorizedStationsResponse,
  StationSelectResponse,
  StationOption,
} from '@org/shared-types';

/**
 * AuthService handles authentication and station selection.
 *
 * Implements the two-step login flow:
 * 1. Validate credentials (loginCode which is stored in U_password)
 * 2. Select authorized station
 *
 * NOTE: In this MES system, U_password serves as BOTH the login ID and password.
 * User enters the same value for both (e.g., "200" / "200").
 *
 * @see specs/user-permission-model.md
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly resourceRepository: ResourceRepository
  ) {}

  /**
   * Authenticate employee with login code and PIN
   *
   * In the MES system, U_password is used as BOTH the login ID and password.
   * Example: User with U_password = '200' logs in with empId=200, pin='200'
   *
   * For backward compatibility, we accept empId but treat it as the login code.
   *
   * @param empId - Login code (stored in U_password, NOT the actual empID)
   * @param pin - PIN (same as login code in MES)
   * @returns Login response with employee info and station count
   * @throws UnauthorizedException when credentials are invalid
   * @throws BadRequestException when input validation fails
   */
  async login(empId: number, pin: string): Promise<LoginResponse> {
    // Input validation - validate empId as number first
    if (!empId || empId <= 0) {
      throw new BadRequestException('Gecersiz calisan numarasi');
    }
    if (!pin || pin.trim() === '') {
      throw new BadRequestException('Sifre gereklidir');
    }

    // Convert empId to string as login code
    const loginCode = String(empId);

    // Find employee by login code (U_password field)
    const employee = await this.employeeRepository.findByLoginCode(loginCode);
    if (!employee) {
      throw new UnauthorizedException('Gecersiz kimlik bilgileri');
    }

    // Validate PIN (in MES, login code = password)
    if (employee.U_password !== pin) {
      throw new UnauthorizedException('Gecersiz kimlik bilgileri');
    }

    // Get authorized station count using U_password (login code)
    // IMPORTANT: ORSC.U_secondEmp contains U_password values, NOT empIDs!
    const machines =
      await this.resourceRepository.findAuthorizedMachinesForWorker(
        employee.U_password
      );

    const empName = `${employee.firstName} ${employee.lastName}`;

    return {
      success: true,
      empId: employee.empID, // Return actual empID for subsequent calls
      empName,
      stationCount: machines.length,
    };
  }

  /**
   * Get list of authorized stations for an employee
   *
   * IMPORTANT: Authorization is based on U_password (login code), NOT empID!
   * We must first look up the employee to get their U_password.
   *
   * @param empId - Employee ID
   * @returns List of authorized stations
   * @throws BadRequestException when empId is invalid or employee not found
   */
  async getAuthorizedStations(
    empId: number
  ): Promise<AuthorizedStationsResponse> {
    // Input validation
    if (!empId || empId <= 0) {
      throw new BadRequestException('Gecersiz calisan numarasi');
    }

    // Look up employee to get their U_password (login code)
    const employee = await this.employeeRepository.findByIdWithPassword(empId);
    if (!employee || !employee.U_password) {
      throw new BadRequestException('Calisan bulunamadi');
    }

    // Get machines using U_password (login code), NOT empID!
    const machines =
      await this.resourceRepository.findAuthorizedMachinesForWorker(
        employee.U_password
      );

    const stations: StationOption[] = machines.map((machine) => ({
      code: machine.ResCode,
      name: machine.ResName,
      isDefault: machine.IsDefault,
    }));

    return {
      empId,
      stations,
    };
  }

  /**
   * Select a station and create session
   *
   * IMPORTANT: Authorization is based on U_password (login code), NOT empID!
   *
   * @param empId - Employee ID
   * @param stationCode - Machine ResCode to select
   * @returns Session information
   * @throws UnauthorizedException when worker is not authorized for machine
   * @throws BadRequestException when machine or employee not found
   */
  async selectStation(
    empId: number,
    stationCode: string
  ): Promise<StationSelectResponse> {
    // Input validation
    if (!empId || empId <= 0) {
      throw new BadRequestException('Gecersiz calisan numarasi');
    }
    if (!stationCode || stationCode.trim() === '') {
      throw new BadRequestException('Istasyon kodu gereklidir');
    }

    // Get employee details first (need U_password for authorization)
    const employee = await this.employeeRepository.findByIdWithPassword(empId);
    if (!employee || !employee.U_password) {
      throw new BadRequestException('Calisan bulunamadi');
    }

    // Check authorization using U_password (login code), NOT empID!
    const isAuthorized =
      await this.resourceRepository.isWorkerAuthorizedForMachine(
        employee.U_password,
        stationCode
      );
    if (!isAuthorized) {
      throw new UnauthorizedException(
        'Bu istasyon icin yetkiniz bulunmamaktadir'
      );
    }

    // Get machine details
    const machine = await this.resourceRepository.findByResCode(stationCode);
    if (!machine) {
      throw new BadRequestException('Istasyon bulunamadi');
    }

    // Determine if this is the worker's default station (compare with U_password)
    const isDefaultWorker = machine.U_defaultEmp === employee.U_password;

    // Create session
    const empName = `${employee.firstName} ${employee.lastName}`;

    return {
      success: true,
      session: {
        empID: employee.empID,
        empName,
        stationCode: machine.ResCode,
        stationName: machine.ResName,
        isDefaultWorker,
        loginTime: new Date().toISOString(),
      },
    };
  }
}
