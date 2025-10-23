# FASE 4 - IMPLEMENTAZIONE EMPLOYEE PORTAL & HACCP SYSTEMS

## Obiettivo Fase
Implementare il sistema completo di gestione del personale con portale dipendenti, sistema HACCP per compliance alimentare, gestione turni avanzata, checklist operative digitali, e sistema di ticketing per manutenzione con dashboard manageriali integrate.

## Prerequisiti Verificati
- Fase 1: Core Backend con autenticazione e RBAC funzionante
- Fase 2: Product & Inventory Management con FEFO operativo
- Fase 3: Order Management con real-time WebSocket communication
- Database con schema completo per operazioni restaurant

## Architettura Moduli Fase 4
- **Employee Management**: Gestione completa dipendenti e timbrature
- **Shift Management**: Pianificazione turni e sostituzioni
- **HACCP Compliance**: Temperature logs, checklist, non-conformità
- **Maintenance System**: Ticketing avanzato con workflow
- **Dashboard Management**: Analytics e KPI per manager
- **Notification System**: Alerts e reminder automatici

---

## 1. Nuove Dipendenze Richieste

### 1.1 Installazione Dipendenze Specializzate
```bash
cd backend

# Gestione date/time avanzata per turni
npm install --save @nestjs/schedule
npm install --save node-cron
npm install --save date-fns date-fns-tz

# File processing per upload documenti HACCP
npm install --save multer
npm install --save @types/multer
npm install --save sharp  # Image processing

# Email notifications per HACCP alerts
npm install --save @nestjs-modules/mailer
npm install --save nodemailer
npm install --save handlebars  # Email templates

# Excel export per reports
npm install --save exceljs
npm install --save @types/node

# QR Code generation per checklist digitali
npm install --save qrcode
npm install --save @types/qrcode

# Advanced validation per business rules
npm install --save class-validator-multi-lang
npm install --save joi

# Dev dependencies
npm install --save-dev @types/nodemailer
npm install --save-dev @types/cron
```

---

## 2. Entità Database Employee & HACCP

### 2.1 Employee Entity Enhanced (src/database/entities/employee.entity.ts)
```typescript
import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Venue } from './venue.entity';
import { TimeLog } from './time-log.entity';
import { Shift } from './shift.entity';
import { EmployeeDocument } from './employee-document.entity';
import { EmployeeStatus } from '../enums/employee-status.enum';
import { ContractType } from '../enums/contract-type.enum';

@Entity('employees')
export class Employee extends BaseEntity {
  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  employee_code: string; // EMP-001, EMP-002, etc.

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  tax_code: string; // Codice fiscale

  @Column({ type: 'date', nullable: true })
  birth_date: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emergency_contact: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  emergency_phone: string;

  @Column({ type: 'date' })
  hire_date: Date;

  @Column({ type: 'date', nullable: true })
  termination_date: Date;

  @Column({ 
    type: 'enum', 
    enum: ContractType,
    default: ContractType.FULL_TIME 
  })
  contract_type: ContractType;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  hourly_rate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthly_salary: number;

  @Column({ 
    type: 'enum', 
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE 
  })
  status: EmployeeStatus;

  @Column({ type: 'jsonb', default: '{}' })
  certifications: {
    haccp_expiry?: Date;
    food_handler_expiry?: Date;
    fire_safety_expiry?: Date;
    first_aid_expiry?: Date;
    [key: string]: any;
  };

  @Column({ type: 'jsonb', default: '{}' })
  preferences: {
    preferred_shifts?: string[];
    unavailable_days?: string[];
    max_hours_per_week?: number;
    notification_methods?: string[];
    [key: string]: any;
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: true })
  can_work_weekends: boolean;

  @Column({ type: 'boolean', default: false })
  can_work_nights: boolean;

  @Column({ type: 'integer', default: 40 })
  max_hours_per_week: number;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @OneToMany(() => TimeLog, timeLog => timeLog.employee)
  timeLogs: TimeLog[];

  @OneToMany(() => Shift, shift => shift.employee)
  shifts: Shift[];

  @OneToMany(() => EmployeeDocument, doc => doc.employee)
  documents: EmployeeDocument[];

  // Virtual fields
  fullName?: string;
  currentShift?: Shift;
  weeklyHours?: number;
  certificationStatus?: 'valid' | 'expiring' | 'expired';
}
```

### 2.2 Time Log Entity (src/database/entities/time-log.entity.ts)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Employee } from './employee.entity';
import { Venue } from './venue.entity';
import { Shift } from './shift.entity';
import { TimeLogType } from '../enums/time-log-type.enum';

@Entity('time_logs')
export class TimeLog extends BaseEntity {
  @Column({ type: 'uuid' })
  employee_id: string;

  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid', nullable: true })
  shift_id: string; // Associated shift if any

  @Column({ 
    type: 'enum', 
    enum: TimeLogType 
  })
  type: TimeLogType;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string; // GPS location or manual entry

  @Column({ type: 'jsonb', nullable: true })
  location_data: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    method?: 'gps' | 'manual' | 'qr_code' | 'nfc';
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  device_info: string; // Device used for clocking

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: false })
  is_correction: boolean; // Manual correction by manager

  @Column({ type: 'uuid', nullable: true })
  corrected_by_user_id: string;

  @Column({ type: 'timestamptz', nullable: true })
  corrected_at: Date;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: {
    break_type?: string; // lunch, coffee, etc.
    original_timestamp?: Date;
    correction_reason?: string;
    approved_overtime?: boolean;
    [key: string]: any;
  };

  // Relations
  @ManyToOne(() => Employee, employee => employee.timeLogs)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  // Virtual fields
  duration?: number; // Calculated duration in minutes
  isOvertime?: boolean;
  pairLog?: TimeLog; // Matching IN/OUT log
}
```

### 2.3 Shift Entity (src/database/entities/shift.entity.ts)
```typescript
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Employee } from './employee.entity';
import { Venue } from './venue.entity';
import { User } from './user.entity';
import { ShiftChecklist } from './shift-checklist.entity';
import { ShiftStatus } from '../enums/shift-status.enum';
import { ShiftType } from '../enums/shift-type.enum';

@Entity('shifts')
export class Shift extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid' })
  employee_id: string;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id: string;

  @Column({ type: 'date' })
  shift_date: Date;

  @Column({ type: 'time' })
  start_time: string; // '09:00:00'

  @Column({ type: 'time' })
  end_time: string; // '17:00:00'

  @Column({ 
    type: 'enum', 
    enum: ShiftType,
    default: ShiftType.REGULAR 
  })
  shift_type: ShiftType;

  @Column({ 
    type: 'enum', 
    enum: ShiftStatus,
    default: ShiftStatus.SCHEDULED 
  })
  status: ShiftStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position: string; // waiter, kitchen, bartender, etc.

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: false })
  is_overtime: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  planned_hours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  actual_hours: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  hourly_rate: number; // Override employee default

  @Column({ type: 'timestamptz', nullable: true })
  clock_in_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  clock_out_time: Date;

  @Column({ type: 'uuid', nullable: true })
  replacement_employee_id: string; // If shift was covered by someone else

  @Column({ type: 'text', nullable: true })
  replacement_reason: string;

  @Column({ type: 'jsonb', default: '{}' })
  break_times: Array<{
    start: Date;
    end: Date;
    type: 'lunch' | 'coffee' | 'other';
    duration_minutes: number;
  }>;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Employee, employee => employee.shifts)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'replacement_employee_id' })
  replacementEmployee: Employee;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @OneToMany(() => ShiftChecklist, checklist => checklist.shift)
  checklists: ShiftChecklist[];

  // Virtual fields
  totalBreakTime?: number;
  effectiveWorkTime?: number;
  overtimeHours?: number;
  grossPay?: number;
}
```

### 2.4 HACCP Temperature Log Entity (src/database/entities/temperature-log.entity.ts)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Employee } from './employee.entity';
import { Venue } from './venue.entity';
import { TemperatureArea } from './temperature-area.entity';
import { TemperatureStatus } from '../enums/temperature-status.enum';

@Entity('temperature_logs')
export class TemperatureLog extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid' })
  employee_id: string;

  @Column({ type: 'uuid' })
  temperature_area_id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  temperature: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  humidity: number; // Optional humidity reading

  @Column({ type: 'timestamptz' })
  recorded_at: Date;

  @Column({ 
    type: 'enum', 
    enum: TemperatureStatus,
    default: TemperatureStatus.NORMAL 
  })
  status: TemperatureStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  corrective_action: string; // Action taken if temperature out of range

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_serial: string; // Thermometer serial number

  @Column({ type: 'jsonb', nullable: true })
  alert_data: {
    alert_triggered: boolean;
    alert_level: 'warning' | 'critical';
    notification_sent: boolean;
    notification_recipients: string[];
    alert_timestamp: Date;
  };

  @Column({ type: 'boolean', default: false })
  requires_manager_review: boolean;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by_user_id: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo_path: string; // Photo of thermometer reading

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => TemperatureArea)
  @JoinColumn({ name: 'temperature_area_id' })
  temperatureArea: TemperatureArea;

  // Virtual fields
  isOutOfRange?: boolean;
  timeSinceLastCheck?: number; // Minutes
  trend?: 'rising' | 'falling' | 'stable';
}
```

### 2.5 Temperature Area Entity (src/database/entities/temperature-area.entity.ts)
```typescript
import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { TemperatureLog } from './temperature-log.entity';
import { AreaType } from '../enums/area-type.enum';

@Entity('temperature_areas')
export class TemperatureArea extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string; // "Walk-in Cooler", "Freezer A", "Hot Holding Station"

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ 
    type: 'enum', 
    enum: AreaType 
  })
  area_type: AreaType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  min_temperature: number; // Minimum safe temperature

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  max_temperature: number; // Maximum safe temperature

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  target_temperature: number; // Ideal temperature

  @Column({ type: 'integer', default: 240 })
  check_frequency_minutes: number; // How often to check (4 hours default)

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string; // Physical location description

  @Column({ type: 'boolean', default: true })
  requires_humidity: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  min_humidity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  max_humidity: number;

  @Column({ type: 'jsonb', default: '{}' })
  alert_settings: {
    warning_threshold_minutes: number; // Alert if no check in X minutes
    critical_threshold_minutes: number;
    notification_emails: string[];
    escalation_chain: string[];
  };

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  qr_code: string; // QR code for easy mobile access

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @OneToMany(() => TemperatureLog, log => log.temperatureArea)
  temperatureLogs: TemperatureLog[];

  // Virtual fields
  lastTemperature?: number;
  lastCheckTime?: Date;
  timeUntilNextCheck?: number;
  currentStatus?: 'normal' | 'warning' | 'critical' | 'overdue';
}
```

### 2.6 Shift Checklist Entity (src/database/entities/shift-checklist.entity.ts)
```typescript
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Shift } from './shift.entity';
import { ChecklistTemplate } from './checklist-template.entity';
import { ChecklistItem } from './checklist-item.entity';
import { ChecklistStatus } from '../enums/checklist-status.enum';

@Entity('shift_checklists')
export class ShiftChecklist extends BaseEntity {
  @Column({ type: 'uuid' })
  shift_id: string;

  @Column({ type: 'uuid' })
  checklist_template_id: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ 
    type: 'enum', 
    enum: ChecklistStatus,
    default: ChecklistStatus.PENDING 
  })
  status: ChecklistStatus;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'integer', default: 0 })
  completed_items: number;

  @Column({ type: 'integer', default: 0 })
  total_items: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  digital_signature: {
    employee_name: string;
    timestamp: Date;
    ip_address: string;
    device_info: string;
  };

  // Relations
  @ManyToOne(() => Shift, shift => shift.checklists)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ManyToOne(() => ChecklistTemplate)
  @JoinColumn({ name: 'checklist_template_id' })
  template: ChecklistTemplate;

  @OneToMany(() => ChecklistItem, item => item.checklist)
  items: ChecklistItem[];

  // Virtual fields
  completionPercentage?: number;
  isOverdue?: boolean;
  estimatedTimeRemaining?: number;
}
```

### 2.7 Maintenance Ticket Entity Enhanced (src/database/entities/maintenance-ticket.entity.ts)
```typescript
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { Employee } from './employee.entity';
import { User } from './user.entity';
import { MaintenanceLog } from './maintenance-log.entity';
import { TicketPriority } from '../enums/ticket-priority.enum';
import { TicketStatus } from '../enums/ticket-status.enum';
import { TicketCategory } from '../enums/ticket-category.enum';

@Entity('maintenance_tickets')
export class MaintenanceTicket extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  ticket_number: string; // MAINT-20241201-001

  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid' })
  reporter_id: string; // Employee who reported

  @Column({ type: 'uuid', nullable: true })
  assignee_id: string; // Employee assigned to fix

  @Column({ 
    type: 'enum', 
    enum: TicketCategory 
  })
  category: TicketCategory;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string; // Kitchen, Dining Area, Storage, etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  equipment: string; // Specific equipment affected

  @Column({ 
    type: 'enum', 
    enum: TicketPriority,
    default: TicketPriority.MEDIUM 
  })
  priority: TicketPriority;

  @Column({ 
    type: 'enum', 
    enum: TicketStatus,
    default: TicketStatus.OPEN 
  })
  status: TicketStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimated_cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actual_cost: number;

  @Column({ type: 'timestamptz', nullable: true })
  due_date: Date;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string;

  @Column({ type: 'jsonb', default: '[]' })
  photo_paths: string[]; // Photos of the issue

  @Column({ type: 'jsonb', default: '{}' })
  custom_fields: {
    warranty_info?: string;
    supplier_contact?: string;
    part_numbers?: string[];
    safety_concerns?: boolean;
    affects_operations?: boolean;
    [key: string]: any;
  };

  @Column({ type: 'boolean', default: false })
  requires_external_service: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  external_service_provider: string;

  @Column({ type: 'text', nullable: true })
  preventive_action: string; // How to prevent in future

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'reporter_id' })
  reporter: Employee;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'assignee_id' })
  assignee: Employee;

  @OneToMany(() => MaintenanceLog, log => log.ticket)
  logs: MaintenanceLog[];

  // Virtual fields
  timeToResolution?: number; // Hours from creation to completion
  isOverdue?: boolean;
  escalationLevel?: number;
  totalCost?: number;
}
```

### 2.8 Status Enums (src/database/enums/)
```typescript
// employee-status.enum.ts
export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended'
}

// contract-type.enum.ts
export enum ContractType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  TEMPORARY = 'temporary',
  SEASONAL = 'seasonal',
  INTERN = 'intern'
}

// time-log-type.enum.ts
export enum TimeLogType {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
  BREAK_START = 'break_start',
  BREAK_END = 'break_end',
  LUNCH_START = 'lunch_start',
  LUNCH_END = 'lunch_end'
}

// shift-status.enum.ts
export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  COVERED = 'covered'
}

// shift-type.enum.ts
export enum ShiftType {
  REGULAR = 'regular',
  OVERTIME = 'overtime',
  HOLIDAY = 'holiday',
  TRAINING = 'training',
  COVER = 'cover'
}

// temperature-status.enum.ts
export enum TemperatureStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical',
  OUT_OF_RANGE = 'out_of_range'
}

// area-type.enum.ts
export enum AreaType {
  REFRIGERATOR = 'refrigerator',
  FREEZER = 'freezer',
  WARMER = 'warmer',
  AMBIENT = 'ambient',
  PREP_AREA = 'prep_area'
}

// checklist-status.enum.ts
export enum ChecklistStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  FAILED = 'failed'
}

// ticket-priority.enum.ts
export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  EMERGENCY = 'emergency'
}

// ticket-status.enum.ts
export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_PARTS = 'waiting_parts',
  WAITING_APPROVAL = 'waiting_approval',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

// ticket-category.enum.ts
export enum TicketCategory {
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  HVAC = 'hvac',
  KITCHEN_EQUIPMENT = 'kitchen_equipment',
  POS_SYSTEM = 'pos_system',
  FURNITURE = 'furniture',
  BUILDING = 'building',
  SAFETY = 'safety',
  OTHER = 'other'
}
```

---

## 3. Business Logic Services

### 3.1 Employee Management Service (src/employees/employees.service.ts)
```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThan, LessThan } from 'typeorm';
import { Employee } from '../database/entities/employee.entity';
import { TimeLog } from '../database/entities/time-log.entity';
import { Shift } from '../database/entities/shift.entity';
import { User } from '../database/entities/user.entity';
import { EmployeeStatus } from '../database/enums/employee-status.enum';
import { TimeLogType } from '../database/enums/time-log-type.enum';
import { ShiftStatus } from '../database/enums/shift-status.enum';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ClockInOutDto } from './dto/clock-in-out.dto';
import { ScheduleShiftDto } from './dto/schedule-shift.dto';
import { NotificationService } from '../common/services/notification.service';
import { QRCodeService } from '../common/services/qrcode.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(TimeLog)
    private readonly timeLogRepository: Repository<TimeLog>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly qrCodeService: QRCodeService,
  ) {}

  async create(venueId: string, createDto: CreateEmployeeDto, createdByUserId: string): Promise<Employee> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check for duplicate employee code
      const existingEmployee = await queryRunner.manager.findOne(Employee, {
        where: { employee_code: createDto.employee_code, venue_id: venueId },
      });

      if (existingEmployee) {
        throw new ConflictException(`Employee code ${createDto.employee_code} already exists`);
      }

      // Create user account if email provided
      let userId = createDto.user_id;
      if (!userId && createDto.email) {
        const user = queryRunner.manager.create(User, {
          email: createDto.email,
          password_hash: await this.hashDefaultPassword(),
          name: `${createDto.first_name} ${createDto.last_name}`,
          role: createDto.role || 'employee',
          venue_id: venueId,
        });
        const savedUser = await queryRunner.manager.save(user);
        userId = savedUser.id;
      }

      // Create employee record
      const employee = queryRunner.manager.create(Employee, {
        ...createDto,
        user_id: userId,
        venue_id: venueId,
        certifications: this.processCertifications(createDto.certifications),
      });

      const savedEmployee = await queryRunner.manager.save(employee);

      await queryRunner.commitTransaction();

      // Send welcome notification
      await this.sendWelcomeNotification(savedEmployee);

      return await this.findOne(venueId, savedEmployee.id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(venueId: string, filters?: {
    status?: EmployeeStatus;
    contract_type?: string;
    position?: string;
    certification_expiring?: boolean;
  }): Promise<Employee[]> {
    const query = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.timeLogs', 'timeLogs')
      .where('employee.venue_id = :venueId', { venueId });

    if (filters?.status) {
      query.andWhere('employee.status = :status', { status: filters.status });
    }

    if (filters?.contract_type) {
      query.andWhere('employee.contract_type = :contractType', { contractType: filters.contract_type });
    }

    if (filters?.certification_expiring) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      query.andWhere(`
        employee.certifications::jsonb ? 'haccp_expiry' AND 
        (employee.certifications->>'haccp_expiry')::date <= :expiryDate
      `, { expiryDate: thirtyDaysFromNow });
    }

    query.orderBy('employee.last_name', 'ASC');

    const employees = await query.getMany();

    // Enrich with calculated fields
    return await Promise.all(employees.map(emp => this.enrichEmployeeData(emp)));
  }

  async findOne(venueId: string, id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id, venue_id: venueId },
      relations: ['user', 'timeLogs', 'shifts', 'documents'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return await this.enrichEmployeeData(employee);
  }

  async clockInOut(
    venueId: string, 
    employeeId: string, 
    clockDto: ClockInOutDto,
    requestInfo: { ip: string; userAgent: string }
  ): Promise<TimeLog> {
    const employee = await this.findOne(venueId, employeeId);

    // Get last time log to determine expected action
    const lastTimeLog = await this.timeLogRepository.findOne({
      where: { employee_id: employeeId },
      order: { timestamp: 'DESC' },
    });

    const expectedType = this.getExpectedTimeLogType(lastTimeLog);
    
    if (clockDto.type !== expectedType) {
      throw new BadRequestException(
        `Expected ${expectedType} but received ${clockDto.type}. ` +
        `Last action was ${lastTimeLog?.type || 'none'} at ${lastTimeLog?.timestamp || 'never'}`
      );
    }

    // Check for current shift
    const currentShift = await this.getCurrentShift(employeeId);

    const timeLog = this.timeLogRepository.create({
      employee_id: employeeId,
      venue_id: venueId,
      shift_id: currentShift?.id,
      type: clockDto.type,
      timestamp: clockDto.timestamp || new Date(),
      location: clockDto.location,
      location_data: clockDto.location_data,
      device_info: requestInfo.userAgent,
      notes: clockDto.notes,
      metadata: {
        ip_address: requestInfo.ip,
        break_type: clockDto.break_type,
      },
    });

    const savedTimeLog = await this.timeLogRepository.save(timeLog);

    // Update shift status if needed
    if (currentShift) {
      await this.updateShiftFromTimeLog(currentShift, savedTimeLog);
    }

    // Check for overtime and send alerts
    await this.checkOvertimeAndNotify(employee, savedTimeLog);

    return savedTimeLog;
  }

  async scheduleShift(venueId: string, scheduleDto: ScheduleShiftDto, createdByUserId: string): Promise<Shift> {
    // Validate employee exists and is active
    const employee = await this.findOne(venueId, scheduleDto.employee_id);
    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Cannot schedule shift for inactive employee');
    }

    // Check for scheduling conflicts
    const conflictingShift = await this.shiftRepository.findOne({
      where: {
        employee_id: scheduleDto.employee_id,
        shift_date: scheduleDto.shift_date,
        status: Not(ShiftStatus.CANCELLED),
      },
    });

    if (conflictingShift) {
      throw new ConflictException('Employee already has a shift scheduled for this date');
    }

    // Calculate planned hours
    const startTime = new Date(`2000-01-01T${scheduleDto.start_time}`);
    const endTime = new Date(`2000-01-01T${scheduleDto.end_time}`);
    let plannedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    // Handle overnight shifts
    if (endTime < startTime) {
      plannedHours += 24;
    }

    // Check employee constraints
    const weeklyHours = await this.getWeeklyHours(
      scheduleDto.employee_id, 
      scheduleDto.shift_date
    );

    if (weeklyHours + plannedHours > employee.max_hours_per_week) {
      throw new BadRequestException(
        `Shift would exceed employee maximum weekly hours (${employee.max_hours_per_week})`
      );
    }

    const shift = this.shiftRepository.create({
      ...scheduleDto,
      venue_id: venueId,
      created_by_user_id: createdByUserId,
      planned_hours: plannedHours,
      hourly_rate: scheduleDto.hourly_rate || employee.hourly_rate,
    });

    const savedShift = await this.shiftRepository.save(shift);

    // Send shift notification to employee
    await this.notificationService.sendShiftScheduled(employee, savedShift);

    return savedShift;
  }

  async getTimesheet(
    venueId: string, 
    employeeId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<{
    employee: Employee;
    timeLogs: TimeLog[];
    shifts: Shift[];
    totalHours: number;
    overtimeHours: number;
    grossPay: number;
  }> {
    const employee = await this.findOne(venueId, employeeId);

    const [timeLogs, shifts] = await Promise.all([
      this.timeLogRepository.find({
        where: {
          employee_id: employeeId,
          timestamp: Between(startDate, endDate),
        },
        order: { timestamp: 'ASC' },
      }),
      this.shiftRepository.find({
        where: {
          employee_id: employeeId,
          shift_date: Between(startDate, endDate),
        },
        order: { shift_date: 'ASC' },
      }),
    ]);

    // Calculate totals
    const { totalHours, overtimeHours } = this.calculateHours(timeLogs, shifts);
    const grossPay = this.calculateGrossPay(employee, totalHours, overtimeHours);

    return {
      employee,
      timeLogs,
      shifts,
      totalHours,
      overtimeHours,
      grossPay,
    };
  }

  async getCertificationReport(venueId: string): Promise<{
    expiringSoon: Employee[]; // Within 30 days
    expired: Employee[];
    upToDate: Employee[];
  }> {
    const employees = await this.findAll(venueId, { status: EmployeeStatus.ACTIVE });
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringSoon = employees.filter(emp => {
      const haccpExpiry = emp.certifications?.haccp_expiry;
      return haccpExpiry && new Date(haccpExpiry) <= thirtyDaysFromNow && new Date(haccpExpiry) > now;
    });

    const expired = employees.filter(emp => {
      const haccpExpiry = emp.certifications?.haccp_expiry;
      return haccpExpiry && new Date(haccpExpiry) <= now;
    });

    const upToDate = employees.filter(emp => {
      const haccpExpiry = emp.certifications?.haccp_expiry;
      return !haccpExpiry || new Date(haccpExpiry) > thirtyDaysFromNow;
    });

    return { expiringSoon, expired, upToDate };
  }

  // Private helper methods
  private getExpectedTimeLogType(lastTimeLog?: TimeLog): TimeLogType {
    if (!lastTimeLog) return TimeLogType.CLOCK_IN;

    switch (lastTimeLog.type) {
      case TimeLogType.CLOCK_IN:
      case TimeLogType.BREAK_END:
      case TimeLogType.LUNCH_END:
        return TimeLogType.CLOCK_OUT;
      case TimeLogType.CLOCK_OUT:
        return TimeLogType.CLOCK_IN;
      case TimeLogType.BREAK_START:
        return TimeLogType.BREAK_END;
      case TimeLogType.LUNCH_START:
        return TimeLogType.LUNCH_END;
      default:
        return TimeLogType.CLOCK_IN;
    }
  }

  private async getCurrentShift(employeeId: string): Promise<Shift | null> {
    const today = new Date().toISOString().split('T')[0];
    
    return await this.shiftRepository.findOne({
      where: {
        employee_id: employeeId,
        shift_date: today,
        status: In([ShiftStatus.SCHEDULED, ShiftStatus.IN_PROGRESS]),
      },
    });
  }

  private async updateShiftFromTimeLog(shift: Shift, timeLog: TimeLog): Promise<void> {
    const updates: Partial<Shift> = {};

    switch (timeLog.type) {
      case TimeLogType.CLOCK_IN:
        updates.status = ShiftStatus.IN_PROGRESS;
        updates.clock_in_time = timeLog.timestamp;
        break;
      case TimeLogType.CLOCK_OUT:
        updates.status = ShiftStatus.COMPLETED;
        updates.clock_out_time = timeLog.timestamp;
        
        // Calculate actual hours
        if (shift.clock_in_time) {
          const hours = (timeLog.timestamp.getTime() - shift.clock_in_time.getTime()) / (1000 * 60 * 60);
          updates.actual_hours = hours;
        }
        break;
    }

    if (Object.keys(updates).length > 0) {
      await this.shiftRepository.update(shift.id, updates);
    }
  }

  private async enrichEmployeeData(employee: Employee): Promise<Employee> {
    // Calculate current shift
    employee.currentShift = await this.getCurrentShift(employee.id);

    // Calculate weekly hours
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    employee.weeklyHours = await this.getWeeklyHours(employee.id, startOfWeek);

    // Set full name
    employee.fullName = `${employee.first_name} ${employee.last_name}`;

    // Check certification status
    employee.certificationStatus = this.getCertificationStatus(employee.certifications);

    return employee;
  }

  private getCertificationStatus(certifications: any): 'valid' | 'expiring' | 'expired' {
    if (!certifications?.haccp_expiry) return 'expired';

    const now = new Date();
    const expiry = new Date(certifications.haccp_expiry);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'valid';
  }

  private async getWeeklyHours(employeeId: string, weekStartDate: Date): Promise<number> {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    const shifts = await this.shiftRepository.find({
      where: {
        employee_id: employeeId,
        shift_date: Between(weekStartDate, weekEndDate),
        status: In([ShiftStatus.COMPLETED, ShiftStatus.IN_PROGRESS]),
      },
    });

    return shifts.reduce((total, shift) => total + (shift.actual_hours || shift.planned_hours || 0), 0);
  }

  private calculateHours(timeLogs: TimeLog[], shifts: Shift[]): { totalHours: number; overtimeHours: number } {
    // Implementation for calculating work hours from time logs
    // This is a simplified version - real implementation would be more complex
    
    const totalHours = shifts.reduce((sum, shift) => sum + (shift.actual_hours || 0), 0);
    const overtimeHours = Math.max(0, totalHours - 40); // Assuming 40-hour work week

    return { totalHours, overtimeHours };
  }

  private calculateGrossPay(employee: Employee, totalHours: number, overtimeHours: number): number {
    const regularHours = totalHours - overtimeHours;
    const regularPay = regularHours * (employee.hourly_rate || 0);
    const overtimePay = overtimeHours * (employee.hourly_rate || 0) * 1.5; // Time and a half

    return regularPay + overtimePay;
  }

  private async sendWelcomeNotification(employee: Employee): Promise<void> {
    // Implementation for sending welcome notification
    await this.notificationService.sendEmployeeWelcome(employee);
  }

  private async checkOvertimeAndNotify(employee: Employee, timeLog: TimeLog): Promise<void> {
    // Check if employee is approaching overtime and send notifications
    if (timeLog.type === TimeLogType.CLOCK_OUT) {
      const weeklyHours = await this.getWeeklyHours(employee.id, new Date());
      
      if (weeklyHours > 35 && weeklyHours < 40) {
        await this.notificationService.sendOvertimeWarning(employee, weeklyHours);
      }
    }
  }

  private processCertifications(certifications: any): any {
    // Process and validate certification data
    if (!certifications) return {};

    // Convert date strings to Date objects
    const processed = { ...certifications };
    if (processed.haccp_expiry) {
      processed.haccp_expiry = new Date(processed.haccp_expiry);
    }
    if (processed.food_handler_expiry) {
      processed.food_handler_expiry = new Date(processed.food_handler_expiry);
    }

    return processed;
  }

  private async hashDefaultPassword(): Promise<string> {
    // Implementation for hashing default password
    const bcrypt = require('bcrypt');
    return await bcrypt.hash('TempPassword123!', 10);
  }
}
```

### 3.2 HACCP Service (src/haccp/haccp.service.ts)
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { TemperatureLog } from '../database/entities/temperature-log.entity';
import { TemperatureArea } from '../database/entities/temperature-area.entity';
import { Employee } from '../database/entities/employee.entity';
import { TemperatureStatus } from '../database/enums/temperature-status.enum';
import { CreateTemperatureLogDto } from './dto/create-temperature-log.dto';
import { CreateTemperatureAreaDto } from './dto/create-temperature-area.dto';
import { NotificationService } from '../common/services/notification.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class HaccpService {
  constructor(
    @InjectRepository(TemperatureLog)
    private readonly temperatureLogRepository: Repository<TemperatureLog>,
    @InjectRepository(TemperatureArea)
    private readonly temperatureAreaRepository: Repository<TemperatureArea>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly notificationService: NotificationService,
  ) {}

  async createTemperatureLog(
    venueId: string, 
    createDto: CreateTemperatureLogDto, 
    employeeId: string
  ): Promise<TemperatureLog> {
    // Validate temperature area exists
    const temperatureArea = await this.temperatureAreaRepository.findOne({
      where: { id: createDto.temperature_area_id, venue_id: venueId, active: true },
    });

    if (!temperatureArea) {
      throw new NotFoundException('Temperature area not found');
    }

    // Validate employee
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, venue_id: venueId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Determine temperature status
    const status = this.determineTemperatureStatus(
      createDto.temperature, 
      temperatureArea
    );

    // Check if this is a critical temperature reading
    const isCritical = status === TemperatureStatus.CRITICAL;
    const requiresReview = isCritical || status === TemperatureStatus.OUT_OF_RANGE;

    const temperatureLog = this.temperatureLogRepository.create({
      ...createDto,
      venue_id: venueId,
      employee_id: employeeId,
      recorded_at: createDto.recorded_at || new Date(),
      status,
      requires_manager_review: requiresReview,
    });

    const savedLog = await this.temperatureLogRepository.save(temperatureLog);

    // Handle alerts for out-of-range temperatures
    if (isCritical || status === TemperatureStatus.OUT_OF_RANGE) {
      await this.handleTemperatureAlert(savedLog, temperatureArea, employee);
    }

    // Update last check time tracking
    await this.updateAreaLastCheck(temperatureArea.id);

    return savedLog;
  }

  async createTemperatureArea(
    venueId: string, 
    createDto: CreateTemperatureAreaDto
  ): Promise<TemperatureArea> {
    // Validate temperature ranges
    if (createDto.min_temperature >= createDto.max_temperature) {
      throw new BadRequestException('Minimum temperature must be less than maximum temperature');
    }

    // Generate QR code for mobile access
    const qrCode = await this.generateAreaQRCode(venueId, createDto.name);

    const temperatureArea = this.temperatureAreaRepository.create({
      ...createDto,
      venue_id: venueId,
      qr_code: qrCode,
    });

    return await this.temperatureAreaRepository.save(temperatureArea);
  }

  async getTemperatureAreas(venueId: string): Promise<TemperatureArea[]> {
    const areas = await this.temperatureAreaRepository.find({
      where: { venue_id: venueId, active: true },
      relations: ['temperatureLogs'],
      order: { name: 'ASC' },
    });

    // Enrich with current status
    return await Promise.all(areas.map(area => this.enrichAreaWithStatus(area)));
  }

  async getTemperatureLogs(
    venueId: string,
    filters?: {
      area_id?: string;
      start_date?: Date;
      end_date?: Date;
      status?: TemperatureStatus;
      requires_review?: boolean;
    }
  ): Promise<TemperatureLog[]> {
    const query = this.temperatureLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.temperatureArea', 'area')
      .leftJoinAndSelect('log.employee', 'employee')
      .where('log.venue_id = :venueId', { venueId });

    if (filters?.area_id) {
      query.andWhere('log.temperature_area_id = :areaId', { areaId: filters.area_id });
    }

    if (filters?.start_date && filters?.end_date) {
      query.andWhere('log.recorded_at BETWEEN :startDate AND :endDate', {
        startDate: filters.start_date,
        endDate: filters.end_date,
      });
    }

    if (filters?.status) {
      query.andWhere('log.status = :status', { status: filters.status });
    }

    if (filters?.requires_review !== undefined) {
      query.andWhere('log.requires_manager_review = :requiresReview', {
        requiresReview: filters.requires_review,
      });
    }

    query.orderBy('log.recorded_at', 'DESC');

    return await query.getMany();
  }

  async getHaccpDashboard(venueId: string): Promise<{
    temperatureOverview: {
      total_areas: number;
      areas_in_range: number;
      areas_warning: number;
      areas_critical: number;
      overdue_checks: number;
    };
    recentAlerts: TemperatureLog[];
    pendingReviews: TemperatureLog[];
    complianceScore: number;
    nextChecks: Array<{
      area: TemperatureArea;
      due_in_minutes: number;
      is_overdue: boolean;
    }>;
  }> {
    const areas = await this.getTemperatureAreas(venueId);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Temperature overview
    const temperatureOverview = {
      total_areas: areas.length,
      areas_in_range: areas.filter(a => a.currentStatus === 'normal').length,
      areas_warning: areas.filter(a => a.currentStatus === 'warning').length,
      areas_critical: areas.filter(a => a.currentStatus === 'critical').length,
      overdue_checks: areas.filter(a => a.currentStatus === 'overdue').length,
    };

    // Recent alerts (last 24 hours)
    const recentAlerts = await this.temperatureLogRepository.find({
      where: {
        venue_id: venueId,
        recorded_at: MoreThan(twentyFourHoursAgo),
        status: In([TemperatureStatus.WARNING, TemperatureStatus.CRITICAL, TemperatureStatus.OUT_OF_RANGE]),
      },
      relations: ['temperatureArea', 'employee'],
      order: { recorded_at: 'DESC' },
      take: 10,
    });

    // Pending reviews
    const pendingReviews = await this.temperatureLogRepository.find({
      where: {
        venue_id: venueId,
        requires_manager_review: true,
        reviewed_at: IsNull(),
      },
      relations: ['temperatureArea', 'employee'],
      order: { recorded_at: 'DESC' },
    });

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(areas, recentAlerts);

    // Next checks due
    const nextChecks = areas
      .map(area => ({
        area,
        due_in_minutes: this.calculateTimeUntilNextCheck(area),
        is_overdue: this.isCheckOverdue(area),
      }))
      .filter(check => check.due_in_minutes <= 240) // Next 4 hours
      .sort((a, b) => a.due_in_minutes - b.due_in_minutes);

    return {
      temperatureOverview,
      recentAlerts,
      pendingReviews,
      complianceScore,
      nextChecks,
    };
  }

  async approveTemperatureLog(
    venueId: string, 
    logId: string, 
    reviewerUserId: string,
    notes?: string
  ): Promise<TemperatureLog> {
    const log = await this.temperatureLogRepository.findOne({
      where: { id: logId, venue_id: venueId },
    });

    if (!log) {
      throw new NotFoundException('Temperature log not found');
    }

    log.reviewed_by_user_id = reviewerUserId;
    log.reviewed_at = new Date();
    log.requires_manager_review = false;
    
    if (notes) {
      log.corrective_action = notes;
    }

    return await this.temperatureLogRepository.save(log);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkOverdueTemperatures(): Promise<void> {
    const venues = await this.getActiveVenues();
    
    for (const venueId of venues) {
      const areas = await this.getTemperatureAreas(venueId);
      
      for (const area of areas) {
        if (this.isCheckOverdue(area)) {
          await this.sendOverdueCheckAlert(area);
        }
      }
    }
  }

  // Private helper methods
  private determineTemperatureStatus(temperature: number, area: TemperatureArea): TemperatureStatus {
    const { min_temperature, max_temperature, target_temperature } = area;

    if (temperature < min_temperature || temperature > max_temperature) {
      // Check if critically out of range (more than 2 degrees beyond limits)
      if (temperature < min_temperature - 2 || temperature > max_temperature + 2) {
        return TemperatureStatus.CRITICAL;
      }
      return TemperatureStatus.OUT_OF_RANGE;
    }

    // Check for warning conditions (within 1 degree of limits)
    if (target_temperature) {
      const variance = Math.abs(temperature - target_temperature);
      if (variance > 1.5) {
        return TemperatureStatus.WARNING;
      }
    }

    return TemperatureStatus.NORMAL;
  }

  private async handleTemperatureAlert(
    log: TemperatureLog, 
    area: TemperatureArea, 
    employee: Employee
  ): Promise<void> {
    const alertLevel = log.status === TemperatureStatus.CRITICAL ? 'critical' : 'warning';
    
    // Update alert data
    log.alert_data = {
      alert_triggered: true,
      alert_level: alertLevel,
      notification_sent: true,
      notification_recipients: area.alert_settings?.notification_emails || [],
      alert_timestamp: new Date(),
    };

    await this.temperatureLogRepository.save(log);

    // Send notifications
    await this.notificationService.sendTemperatureAlert(log, area, employee, alertLevel);
  }

  private async enrichAreaWithStatus(area: TemperatureArea): Promise<TemperatureArea> {
    // Get latest temperature reading
    const latestLog = await this.temperatureLogRepository.findOne({
      where: { temperature_area_id: area.id },
      order: { recorded_at: 'DESC' },
    });

    if (latestLog) {
      area.lastTemperature = latestLog.temperature;
      area.lastCheckTime = latestLog.recorded_at;
    }

    // Calculate time until next check
    area.timeUntilNextCheck = this.calculateTimeUntilNextCheck(area);

    // Determine current status
    area.currentStatus = this.getCurrentAreaStatus(area, latestLog);

    return area;
  }

  private calculateTimeUntilNextCheck(area: TemperatureArea): number {
    if (!area.lastCheckTime) {
      return -1; // Never checked - overdue
    }

    const nextCheckTime = new Date(area.lastCheckTime.getTime() + area.check_frequency_minutes * 60 * 1000);
    const now = new Date();
    
    return Math.floor((nextCheckTime.getTime() - now.getTime()) / (1000 * 60));
  }

  private isCheckOverdue(area: TemperatureArea): boolean {
    return this.calculateTimeUntilNextCheck(area) < 0;
  }

  private getCurrentAreaStatus(area: TemperatureArea, latestLog?: TemperatureLog): string {
    if (this.isCheckOverdue(area)) {
      return 'overdue';
    }

    if (!latestLog) {
      return 'unknown';
    }

    switch (latestLog.status) {
      case TemperatureStatus.CRITICAL:
        return 'critical';
      case TemperatureStatus.OUT_OF_RANGE:
      case TemperatureStatus.WARNING:
        return 'warning';
      default:
        return 'normal';
    }
  }

  private calculateComplianceScore(areas: TemperatureArea[], recentAlerts: TemperatureLog[]): number {
    if (areas.length === 0) return 100;

    const overdueCount = areas.filter(a => a.currentStatus === 'overdue').length;
    const criticalCount = areas.filter(a => a.currentStatus === 'critical').length;
    const warningCount = areas.filter(a => a.currentStatus === 'warning').length;

    let score = 100;
    score -= (overdueCount * 20); // -20 points per overdue area
    score -= (criticalCount * 15); // -15 points per critical area
    score -= (warningCount * 5);   // -5 points per warning area
    score -= (recentAlerts.length * 2); // -2 points per recent alert

    return Math.max(0, score);
  }

  private async generateAreaQRCode(venueId: string, areaName: string): Promise<string> {
    const QRCode = require('qrcode');
    const qrData = JSON.stringify({
      venue_id: venueId,
      area_name: areaName,
      type: 'temperature_check',
      timestamp: new Date().toISOString(),
    });
    
    return await QRCode.toDataURL(qrData);
  }

  private async updateAreaLastCheck(areaId: string): Promise<void> {
    // This could be implemented to update a cache or trigger other actions
    // For now, we rely on the latest log query
  }

  private async getActiveVenues(): Promise<string[]> {
    // Get list of active venue IDs - implementation depends on venue structure
    const venues = await this.temperatureAreaRepository
      .createQueryBuilder('area')
      .select('DISTINCT area.venue_id')
      .where('area.active = :active', { active: true })
      .getRawMany();

    return venues.map(v => v.venue_id);
  }

  private async sendOverdueCheckAlert(area: TemperatureArea): Promise<void> {
    await this.notificationService.sendOverdueTemperatureCheck(area);
  }
}
```

---

## 4. Controllers con Validazione Avanzata

### 4.1 Employees Controller (src/employees/employees.controller.ts)
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ClockInOutDto } from './dto/clock-in-out.dto';
import { ScheduleShiftDto } from './dto/schedule-shift.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { TimesheetQueryDto } from './dto/timesheet-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { VenueGuard } from '../common/guards/venue.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VenueAccess } from '../common/decorators/venue-access.decorator';
import { UserRole } from '../database/enums/user-role.enum';
import { EmployeeStatus } from '../database/enums/employee-status.enum';
import { User } from '../database/entities/user.entity';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, VenueGuard)
@Controller('venues/:venueId/employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Create new employee' })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  @ApiResponse({ status: 409, description: 'Employee code already exists' })
  create(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() createEmployeeDto: CreateEmployeeDto,
    @CurrentUser() user: User,
  ) {
    return this.employeesService.create(venueId, createEmployeeDto, user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR)
  @VenueAccess()
  @ApiOperation({ summary: 'Get all employees with filtering' })
  @ApiQuery({ name: 'status', required: false, enum: EmployeeStatus })
  @ApiQuery({ name: 'contract_type', required: false, type: String })
  @ApiQuery({ name: 'position', required: false, type: String })
  @ApiQuery({ name: 'certification_expiring', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Employees retrieved successfully' })
  findAll(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query() query: EmployeeQueryDto,
  ) {
    return this.employeesService.findAll(venueId, query);
  }

  @Get('certifications/report')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR)
  @VenueAccess()
  @ApiOperation({ summary: 'Get certification status report' })
  @ApiResponse({ status: 200, description: 'Certification report generated' })
  getCertificationReport(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return this.employeesService.getCertificationReport(venueId);
  }

  @Post('clock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.WAITER, UserRole.KITCHEN)
  @VenueAccess()
  @ApiOperation({ summary: 'Clock in/out for employee' })
  @ApiResponse({ status: 201, description: 'Time logged successfully' })
  @ApiResponse({ status: 400, description: 'Invalid clock action or sequence' })
  clockInOut(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() clockDto: ClockInOutDto,
    @CurrentUser() user: User,
    @Req() request: any,
  ) {
    const requestInfo = {
      ip: request.ip,
      userAgent: request.get('User-Agent') || 'Unknown',
    };
    
    return this.employeesService.clockInOut(
      venueId, 
      clockDto.employee_id || user.employee?.id, 
      clockDto, 
      requestInfo
    );
  }

  @Post('shifts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Schedule employee shift' })
  @ApiResponse({ status: 201, description: 'Shift scheduled successfully' })
  @ApiResponse({ status: 409, description: 'Scheduling conflict exists' })
  scheduleShift(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() scheduleDto: ScheduleShiftDto,
    @CurrentUser() user: User,
  ) {
    return this.employeesService.scheduleShift(venueId, scheduleDto, user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR, UserRole.EMPLOYEE)
  @VenueAccess()
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiResponse({ status: 200, description: 'Employee retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  findOne(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.findOne(venueId, id);
  }

  @Get(':id/timesheet')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR, UserRole.EMPLOYEE)
  @VenueAccess()
  @ApiOperation({ summary: 'Get employee timesheet' })
  @ApiQuery({ name: 'start_date', required: true, type: Date })
  @ApiQuery({ name: 'end_date', required: true, type: Date })
  @ApiResponse({ status: 200, description: 'Timesheet retrieved successfully' })
  getTimesheet(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TimesheetQueryDto,
  ) {
    return this.employeesService.getTimesheet(
      venueId, 
      id, 
      query.start_date, 
      query.end_date
    );
  }

  @Post(':id/photo')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @VenueAccess()
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload employee photo' })
  @ApiResponse({ status: 200, description: 'Photo uploaded successfully' })
  uploadPhoto(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.employeesService.uploadPhoto(venueId, id, file);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR)
  @VenueAccess()
  @ApiOperation({ summary: 'Update employee' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  update(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(venueId, id, updateEmployeeDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Deactivate employee' })
  @ApiResponse({ status: 200, description: 'Employee deactivated successfully' })
  remove(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.deactivate(venueId, id);
  }
}
```

### 4.2 HACCP Controller (src/haccp/haccp.controller.ts)
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { HaccpService } from './haccp.service';
import { CreateTemperatureLogDto } from './dto/create-temperature-log.dto';
import { CreateTemperatureAreaDto } from './dto/create-temperature-area.dto';
import { TemperatureQueryDto } from './dto/temperature-query.dto';
import { ApproveTemperatureLogDto } from './dto/approve-temperature-log.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { VenueGuard } from '../common/guards/venue.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VenueAccess } from '../common/decorators/venue-access.decorator';
import { UserRole } from '../database/enums/user-role.enum';
import { TemperatureStatus } from '../database/enums/temperature-status.enum';
import { User } from '../database/entities/user.entity';

@ApiTags('haccp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, VenueGuard)
@Controller('venues/:venueId/haccp')
export class HaccpController {
  constructor(private readonly haccpService: HaccpService) {}

  @Post('temperature-areas')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Create temperature monitoring area' })
  @ApiResponse({ status: 201, description: 'Temperature area created successfully' })
  createTemperatureArea(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() createAreaDto: CreateTemperatureAreaDto,
  ) {
    return this.haccpService.createTemperatureArea(venueId, createAreaDto);
  }

  @Get('temperature-areas')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.KITCHEN)
  @VenueAccess()
  @ApiOperation({ summary: 'Get all temperature monitoring areas' })
  @ApiResponse({ status: 200, description: 'Temperature areas retrieved successfully' })
  getTemperatureAreas(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return this.haccpService.getTemperatureAreas(venueId);
  }

  @Post('temperature-logs')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.KITCHEN)
  @VenueAccess()
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Record temperature reading' })
  @ApiResponse({ status: 201, description: 'Temperature logged successfully' })
  @ApiResponse({ status: 400, description: 'Invalid temperature data' })
  recordTemperature(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() createLogDto: CreateTemperatureLogDto,
    @CurrentUser() user: User,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.haccpService.createTemperatureLog(venueId, createLogDto, user.employee?.id);
  }

  @Get('temperature-logs')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @VenueAccess()
  @ApiOperation({ summary: 'Get temperature logs with filtering' })
  @ApiQuery({ name: 'area_id', required: false, type: String })
  @ApiQuery({ name: 'start_date', required: false, type: Date })
  @ApiQuery({ name: 'end_date', required: false, type: Date })
  @ApiQuery({ name: 'status', required: false, enum: TemperatureStatus })
  @ApiQuery({ name: 'requires_review', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Temperature logs retrieved successfully' })
  getTemperatureLogs(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query() query: TemperatureQueryDto,
  ) {
    return this.haccpService.getTemperatureLogs(venueId, query);
  }

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Get HACCP compliance dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  getDashboard(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return this.haccpService.getHaccpDashboard(venueId);
  }

  @Patch('temperature-logs/:logId/approve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Approve temperature log requiring review' })
  @ApiResponse({ status: 200, description: 'Temperature log approved successfully' })
  @ApiResponse({ status: 404, description: 'Temperature log not found' })
  approveTemperatureLog(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('logId', ParseUUIDPipe) logId: string,
    @Body() approveDto: ApproveTemperatureLogDto,
    @CurrentUser() user: User,
  ) {
    return this.haccpService.approveTemperatureLog(
      venueId, 
      logId, 
      user.id, 
      approveDto.notes
    );
  }

  @Get('reports/compliance')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Generate HACCP compliance report' })
  @ApiQuery({ name: 'start_date', required: true, type: Date })
  @ApiQuery({ name: 'end_date', required: true, type: Date })
  @ApiResponse({ status: 200, description: 'Compliance report generated' })
  getComplianceReport(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query('start_date') startDate: Date,
    @Query('end_date') endDate: Date,
  ) {
    return this.haccpService.generateComplianceReport(venueId, startDate, endDate);
  }

  @Get('areas/:areaId/qr-code')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @VenueAccess()
  @ApiOperation({ summary: 'Get QR code for temperature area' })
  @ApiResponse({ status: 200, description: 'QR code retrieved successfully' })
  getAreaQRCode(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('areaId', ParseUUIDPipe) areaId: string,
  ) {
    return this.haccpService.getAreaQRCode(venueId, areaId);
  }
}
```

---

## 5. DTOs con Validazione Avanzata

### 5.1 Create Employee DTO (src/employees/dto/create-employee.dto.ts)
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
  IsEnum,
  IsBoolean,
  IsObject,
  ValidateNested,
  Length,
  Matches,
  IsPhoneNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ContractType } from '../../database/enums/contract-type.enum';
import { UserRole } from '../../database/enums/user-role.enum';

class CertificationDto {
  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  haccp_expiry?: string;

  @ApiPropertyOptional({ example: '2025-06-30' })
  @IsOptional()
  @IsDateString()
  food_handler_expiry?: string;

  @ApiPropertyOptional({ example: '2025-03-15' })
  @IsOptional()
  @IsDateString()
  fire_safety_expiry?: string;

  @ApiPropertyOptional({ example: '2025-09-20' })
  @IsOptional()
  @IsDateString()
  first_aid_expiry?: string;
}

class PreferencesDto {
  @ApiPropertyOptional({ example: ['morning', 'evening'] })
  @IsOptional()
  @IsString({ each: true })
  preferred_shifts?: string[];

  @ApiPropertyOptional({ example: ['sunday'] })
  @IsOptional()
  @IsString({ each: true })
  unavailable_days?: string[];

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  max_hours_per_week?: number;

  @ApiPropertyOptional({ example: ['email', 'sms'] })
  @IsOptional()
  @IsString({ each: true })
  notification_methods?: string[];
}

export class CreateEmployeeDto {
  @ApiProperty({ example: 'EMP-001' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  @Matches(/^[A-Z0-9\-_]+$/i, { 
    message: 'Employee code can only contain letters, numbers, hyphens and underscores' 
  })
  employee_code: string;

  @ApiProperty({ example: 'Mario' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  first_name: string;

  @ApiProperty({ example: 'Rossi' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  last_name: string;

  @ApiPropertyOptional({ example: 'mario.rossi@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'RSSMRA85M01H501Z' })
  @IsOptional()
  @IsString()
  @Length(16, 16)
  @Matches(/^[A-Z0-9]{16}$/, { message: 'Invalid tax code format' })
  tax_code?: string;

  @ApiPropertyOptional({ example: '1985-08-15' })
  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @ApiPropertyOptional({ example: 'Via Roma 123, Milano, MI' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  address?: string;

  @ApiPropertyOptional({ example: '+39 123 456 7890' })
  @IsOptional()
  @IsPhoneNumber('IT')
  phone?: string;

  @ApiPropertyOptional({ example: 'Giulia Rossi' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  emergency_contact?: string;

  @ApiPropertyOptional({ example: '+39 987 654 3210' })
  @IsOptional()
  @IsPhoneNumber('IT')
  emergency_phone?: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  hire_date: string;

  @ApiPropertyOptional({ enum: ContractType, example: ContractType.FULL_TIME })
  @IsOptional()
  @IsEnum(ContractType)
  contract_type?: ContractType;

  @ApiPropertyOptional({ example: 15.50 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  hourly_rate?: number;

  @ApiPropertyOptional({ example: 2500.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  monthly_salary?: number;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.WAITER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ type: CertificationDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CertificationDto)
  certifications?: CertificationDto;

  @ApiPropertyOptional({ type: PreferencesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;

  @ApiPropertyOptional({ example: 'Experienced waiter with excellent customer service skills' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  can_work_weekends?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  can_work_nights?: boolean;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => parseInt(value))
  max_hours_per_week?: number;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsString()
  user_id?: string;
}
```

### 5.2 Clock In/Out DTO (src/employees/dto/clock-in-out.dto.ts)
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsString,
  IsObject,
  IsNumber,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TimeLogType } from '../../database/enums/time-log-type.enum';

class LocationDataDto {
  @ApiPropertyOptional({ example: 45.4642 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 9.1900 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 10.5 })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ example: 'gps' })
  @IsOptional()
  @IsString()
  method?: 'gps' | 'manual' | 'qr_code' | 'nfc';
}

export class ClockInOutDto {
  @ApiProperty({ enum: TimeLogType, example: TimeLogType.CLOCK_IN })
  @IsEnum(TimeLogType)
  type: TimeLogType;

  @ApiPropertyOptional({ example: '2024-12-01T09:00:00Z' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ example: 'Main Restaurant Entrance' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ type: LocationDataDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDataDto)
  location_data?: LocationDataDto;

  @ApiPropertyOptional({ example: 'Starting morning shift' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'lunch' })
  @IsOptional()
  @IsString()
  break_type?: 'lunch' | 'coffee' | 'other';

  @ApiPropertyOptional({ 
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Employee ID - optional if clocking for self'
  })
  @IsOptional()
  @IsUUID(4)
  employee_id?: string;
}
```

### 5.3 Temperature Log DTO (src/haccp/dto/create-temperature-log.dto.ts)
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsDateString,
  IsString,
  IsDecimal,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTemperatureLogDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsUUID(4)
  temperature_area_id: string;

  @ApiProperty({ 
    example: 4.5,
    description: 'Temperature in Celsius'
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-50, { message: 'Temperature cannot be below -50°C' })
  @Max(100, { message: 'Temperature cannot be above 100°C' })
  @Transform(({ value }) => parseFloat(value))
  temperature: number;

  @ApiPropertyOptional({ 
    example: 65.5,
    description: 'Humidity percentage'
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Humidity cannot be below 0%' })
  @Max(100, { message: 'Humidity cannot be above 100%' })
  @Transform(({ value }) => parseFloat(value))
  humidity?: number;

  @ApiPropertyOptional({ example: '2024-12-01T14:30:00Z' })
  @IsOptional()
  @IsDateString()
  recorded_at?: string;

  @ApiPropertyOptional({ example: 'All items properly stored, no issues observed' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;

  @ApiPropertyOptional({ example: 'Adjusted thermostat to maintain proper temperature' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  corrective_action?: string;

  @ApiPropertyOptional({ example: 'THERM-001-2024' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  device_serial?: string;
}

## 8. Criteri di Completamento Fase 4

### Verifiche Funzionali Obbligatorie:
1. Employee Management: CRUD completo con timbrature e gestione turni
2. HACCP Compliance: Temperature logs, checklist, alerts automatici
3. Shift Management: Pianificazione, sostituzioni, overtime tracking
4. Maintenance System: Ticketing con workflow e priorità
5. Notification System: Email alerts per eventi critici
6. Scheduled Tasks: Cron jobs per certificazioni e reports

### Business Logic Requirements:
1. Time Tracking: Sequenza corretta clock in/out, prevenzione errori
2. HACCP Alerts: Temperature fuori range trigger notifiche immediate
3. Certification Tracking: Alerts automatici per scadenze
4. Overtime Management: Calcolo automatico e notifiche threshold
5. Shift Conflicts: Prevenzione scheduling conflicts
6. Data Integrity: Audit trail completo per compliance

### Integration Requirements:
- Phase 1-3 Integration: Sistema completo employee/orders/stock
- Real-time Notifications: Alerts via email per eventi critici
- QR Code Integration: Mobile access per temperature checks
- Scheduled Jobs: Automazione reports e monitoring
- Performance: Employee operations < 200ms, HACCP logs < 100ms

### Endpoints da Testare:
- POST /api/v1/venues/{venueId}/employees - Creazione dipendente
- POST /api/v1/venues/{venueId}/employees/clock - Timbratura
- POST /api/v1/venues/{venueId}/employees/shifts - Pianificazione turno
- POST /api/v1/venues/{venueId}/haccp/temperature-logs - Log temperatura
- GET /api/v1/venues/{venueId}/haccp/dashboard - Dashboard HACCP
- POST /api/v1/venues/{venueId}/maintenance/tickets - Ticket manutenzione

### Compliance & Security:

- HACCP Compliance: Audit trail immutabile per controlli
- Data Privacy: Gestione sicura dati personali dipendenti
- Authorization: Role-based access per operazioni sensibili
- Notifications: Delivery garantito per alerts critici

La Fase 4 è completa quando tutti i sistemi employee e HACCP funzionano end-to-end con notifications automatiche e compliance verificata.