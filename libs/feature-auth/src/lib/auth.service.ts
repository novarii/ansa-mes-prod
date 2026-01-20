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
    // Convert empId to string as login code
    const loginCode = String(empId);

    // Input validation
    if (!loginCode || loginCode.trim() === '') {
      throw new BadRequestException('Gecersiz calisan numarasi');
    }
    if (!pin || pin.trim() === '') {
      throw new BadRequestException('Sifre gereklidir');
    }

    // Find employee by login code (U_password field)
    const employee = await this.employeeRepository.findByLoginCode(loginCode);
    if (!employee) {
      throw new UnauthorizedException('Gecersiz kimlik bilgileri');
    }

    // Validate PIN (in MES, login code = password)
    if (employee.U_password !== pin) {
      throw new UnauthorizedException('Gecersiz kimlik bilgileri');
    }

    // Get authorized station count using actual empID
    const machines =
      await this.resourceRepository.findAuthorizedMachinesForWorker(
        employee.empID
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
   * @param empId - Employee ID
   * @returns List of authorized stations
   * @throws BadRequestException when empId is invalid
   */
  async getAuthorizedStations(
    empId: number
  ): Promise<AuthorizedStationsResponse> {
    // Input validation
    if (!empId || empId <= 0) {
      throw new BadRequestException('Gecersiz calisan numarasi');
    }

    const machines =
      await this.resourceRepository.findAuthorizedMachinesForWorker(empId);

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

    // Check authorization first
    const isAuthorized =
      await this.resourceRepository.isWorkerAuthorizedForMachine(
        empId,
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

    // Get employee details
    const employee = await this.employeeRepository.findById(empId);
    if (!employee) {
      throw new BadRequestException('Calisan bulunamadi');
    }

    // Determine if this is the worker's default station
    const isDefaultWorker = machine.U_defaultEmp === String(empId);

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
