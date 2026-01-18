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
 * 1. Validate credentials (empId + PIN)
 * 2. Select authorized station
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
   * Authenticate employee with ID and PIN
   *
   * @param empId - Employee ID
   * @param pin - PIN or password
   * @returns Login response with employee info and station count
   * @throws UnauthorizedException when credentials are invalid
   * @throws BadRequestException when input validation fails
   */
  async login(empId: number, pin: string): Promise<LoginResponse> {
    // Input validation
    if (!empId || empId <= 0) {
      throw new BadRequestException('Gecersiz calisan numarasi');
    }
    if (!pin || pin.trim() === '') {
      throw new BadRequestException('Sifre gereklidir');
    }

    // Validate credentials
    const isValid = await this.employeeRepository.validatePassword(empId, pin);
    if (!isValid) {
      throw new UnauthorizedException('Gecersiz kimlik bilgileri');
    }

    // Get employee details
    const employee = await this.employeeRepository.findByIdWithPassword(empId);
    if (!employee) {
      throw new UnauthorizedException('Calisan bulunamadi');
    }

    // Get authorized station count
    const machines =
      await this.resourceRepository.findAuthorizedMachinesForWorker(empId);

    const empName = `${employee.firstName} ${employee.lastName}`;

    return {
      success: true,
      empId: employee.empID,
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
