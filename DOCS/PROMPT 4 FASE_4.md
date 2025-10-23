# PROMPT_4_FASE_4.md

## PROMPT ULTRA-DETTAGLIATO PER JULES - FASE 4

### PROMPT 1: FASE_4_IMPLEMENTATION
```
PROMPT PER JULES - FASE 4 IMPLEMENTAZIONE EMPLOYEE PORTAL & HACCP COMPLIANCE

CONTESTO:
Fasi 1, 2 e 3 sono completate e funzionanti (Core Backend + Products/Stock + Orders/Tables). Ora devi implementare la Fase 4: sistema completo Employee Management con Time Clock, HACCP Compliance con temperature monitoring real-time, Notification System avanzato e Scheduled Tasks per automation compliance.

OBIETTIVO:
Implementare ESATTAMENTE il sistema Employee Portal & HACCP Compliance seguendo FASE_4_IMPLEMENTATION.md. Focus critico su business logic time tracking, HACCP compliance automatica e notifications system per eventi critici.

TASK SPECIFICI:
1. Implementa TUTTE le nuove entità: Employee, EmployeePosition, EmployeeShift, TimeClockEntry, HACCPTemperatureArea, HACCPTemperatureLog, MaintenanceTicket, Notification
2. Crea Time Clock System con validazione sequenza IN/OUT/BREAK e prevenzione errori
3. Implementa HACCP Temperature monitoring con alerts automatici per critical ranges
4. Crea Notification System con email delivery garantito per eventi critici
5. Implementa Scheduled Tasks (cron jobs) per certificazioni scadute e compliance automation
6. Setup QR Code system per mobile HACCP temperature checks
7. Crea Employee Management con shift scheduling e overtime tracking
8. Integra Maintenance Ticket system con workflow priorità e assegnazione
9. Implementa TUTTI i Controller con endpoint API documentati e authorization

VINCOLI TECNICI CRITICI:
- Time clock DEVE seguire sequenza logica: IN → BREAK_START → BREAK_END → OUT (no sequenze invalide)
- HACCP alerts DEVONO triggerare email notification < 1 minuto per critical temperatures
- Notifications DEVONO avere delivery tracking e retry mechanism
- Employee data DEVE rispettare privacy (GDPR compliant)
- Performance: employee operations < 200ms, HACCP logs < 100ms, notifications < 500ms
- Scheduled tasks DEVONO essere fault-tolerant con logging completo

BUSINESS LOGIC REQUIREMENTS:
- Time Tracking: Clock IN/OUT sequence validation, break tracking, overtime calculation automatico
- HACCP Compliance: Temperature logging con ranges validation, critical alerts immediate, manager review workflow
- Certification Tracking: Automatic expiry alerts, certification renewal reminders
- Shift Management: Conflict prevention, overtime warnings, replacement notifications
- Notification System: Email delivery con retry, escalation management, delivery confirmation
- Maintenance Workflow: Priority-based tickets, assignment automation, status tracking
- Authorization: Role-based access (employee self-service, manager oversight, admin full control)

INTEGRATION REQUIREMENTS:
- DEVE utilizzare JWT authentication esistente con employee-specific claims
- DEVE integrare con Order tracking per employee performance metrics
- DEVE mantenere audit trail immutabile per HACCP compliance
- DEVE rispettare venue isolation per multi-tenant environment
- DEVE usare TypeORM entities con relazioni corrette per data integrity

DIPENDENZE OBBLIGATORIE:
```bash
# Email notifications
npm install @nestjs/mailer nodemailer handlebars
# Scheduled tasks
npm install @nestjs/schedule node-cron
# QR Code generation
npm install qrcode @types/qrcode
# PDF generation per reports
npm install puppeteer-core @sparticuz/chromium
# File upload handling
npm install @nestjs/platform-express multer @types/multer
# Date/time utilities
npm install luxon @types/luxon
# Email templates
npm install mjml mjml-react
# Dev dependencies
npm install -D @types/node-cron @types/nodemailer
```

STRUTTURA DIRECTORY ESATTA:
```
backend/src/
├── employees/
│   ├── employees.controller.ts
│   ├── employees.service.ts
│   ├── employees.module.ts
│   ├── time-clock.service.ts       # Time tracking logic
│   ├── shift-management.service.ts # Shift scheduling
│   └── dto/
│       ├── create-employee.dto.ts
│       ├── update-employee.dto.ts
│       ├── clock-entry.dto.ts
│       ├── create-shift.dto.ts
│       └── timesheet-query.dto.ts
├── haccp/
│   ├── haccp.controller.ts
│   ├── haccp.service.ts
│   ├── haccp.module.ts
│   ├── temperature-monitoring.service.ts
│   ├── compliance-checker.service.ts
│   └── dto/
│       ├── create-temperature-area.dto.ts
│       ├── log-temperature.dto.ts
│       ├── approve-log.dto.ts
│       └── haccp-dashboard.dto.ts
├── notifications/
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   ├── notifications.module.ts
│   ├── email.service.ts           # Email delivery
│   ├── notification-queue.service.ts
│   └── dto/
│       ├── send-notification.dto.ts
│       └── notification-preferences.dto.ts
├── maintenance/
│   ├── maintenance.controller.ts
│   ├── maintenance.service.ts
│   ├── maintenance.module.ts
│   └── dto/
│       ├── create-ticket.dto.ts
│       ├── update-ticket.dto.ts
│       └── assign-ticket.dto.ts
├── scheduled-tasks/
│   ├── scheduled-tasks.service.ts
│   ├── certification-check.task.ts
│   ├── haccp-compliance.task.ts
│   └── overtime-alerts.task.ts
├── database/entities/
│   ├── employee.entity.ts
│   ├── employee-position.entity.ts
│   ├── employee-shift.entity.ts
│   ├── time-clock-entry.entity.ts
│   ├── haccp-temperature-area.entity.ts
│   ├── haccp-temperature-log.entity.ts
│   ├── maintenance-ticket.entity.ts
│   └── notification.entity.ts
└── database/enums/
    ├── employee-status.enum.ts
    ├── contract-type.enum.ts
    ├── time-clock-type.enum.ts
    ├── temperature-status.enum.ts
    ├── ticket-status.enum.ts
    ├── ticket-priority.enum.ts
    └── notification-type.enum.ts
```

ENTITIES IMPLEMENTATION OBBLIGATORIA (USA ESATTAMENTE QUESTI CAMPI):
- Employee: id, venue_id, employee_code, first_name, last_name, email, phone, hire_date, contract_type, hourly_rate, certification_expiry, position_id, is_active
- TimeClockEntry: id, employee_id, type (clock_in/clock_out/break_start/break_end), timestamp, location, notes, is_verified
- EmployeeShift: id, employee_id, date, start_time, end_time, shift_type, position, hourly_rate, is_overtime
- HACCPTemperatureArea: id, venue_id, name, location, min_temp, max_temp, check_frequency_hours, is_critical
- HACCPTemperatureLog: id, area_id, employee_id, temperature, status (normal/warning/critical), timestamp, notes, manager_reviewed_at, manager_id
- MaintenanceTicket: id, venue_id, title, description, priority, status, assigned_to, created_by, due_date, completed_at
- Notification: id, venue_id, type, recipient_id, subject, content, delivery_method, status, sent_at, delivery_confirmed_at

TIME CLOCK BUSINESS RULES OBBLIGATORIE:
1. Sequence Validation:
   ```typescript
   // Valid sequences only:
   // NONE → CLOCK_IN
   // CLOCK_IN → BREAK_START or CLOCK_OUT
   // BREAK_START → BREAK_END
   // BREAK_END → BREAK_START or CLOCK_OUT
   // CLOCK_OUT → CLOCK_IN (next day)
   
   async validateClockSequence(employeeId: string, type: TimeClockType): Promise<boolean> {
     const lastEntry = await this.getLastClockEntry(employeeId)
     
     if (!lastEntry && type !== TimeClockType.CLOCK_IN) {
       throw new BadRequestException('Must clock in first')
     }
     
     const validTransitions = {
       [TimeClockType.CLOCK_IN]: [null, TimeClockType.CLOCK_OUT],
       [TimeClockType.BREAK_START]: [TimeClockType.CLOCK_IN, TimeClockType.BREAK_END],
       [TimeClockType.BREAK_END]: [TimeClockType.BREAK_START],
       [TimeClockType.CLOCK_OUT]: [TimeClockType.CLOCK_IN, TimeClockType.BREAK_END]
     }
     
     return validTransitions[type].includes(lastEntry?.type)
   }
   ```

2. Overtime Calculation:
   ```typescript
   async calculateDailyHours(employeeId: string, date: Date): Promise<{
     regularHours: number;
     overtimeHours: number;
     totalHours: number;
   }> {
     const entries = await this.getDailyClockEntries(employeeId, date)
     const workPeriods = this.calculateWorkPeriods(entries)
     const totalMinutes = workPeriods.reduce((sum, period) => sum + period.minutes, 0)
     const totalHours = totalMinutes / 60
     
     const regularHours = Math.min(totalHours, 8) // 8h regular
     const overtimeHours = Math.max(0, totalHours - 8)
     
     return { regularHours, overtimeHours, totalHours }
   }
   ```

HACCP BUSINESS RULES OBBLIGATORIE:
1. Temperature Status Detection:
   ```typescript
   async logTemperature(areaId: string, temperature: number, employeeId: string): Promise<HACCPTemperatureLog> {
     const area = await this.findTemperatureArea(areaId)
     
     let status: TemperatureStatus = TemperatureStatus.NORMAL
     
     if (temperature < area.min_temp || temperature > area.max_temp) {
       status = TemperatureStatus.CRITICAL
       
       // Trigger immediate alert for critical temperatures
       await this.notificationService.sendCriticalTemperatureAlert(area, temperature, employeeId)
     } else if (
       temperature < area.min_temp + 2 || 
       temperature > area.max_temp - 2
     ) {
       status = TemperatureStatus.WARNING
     }
     
     const log = await this.temperatureLogRepository.save({
       area_id: areaId,
       employee_id: employeeId,
       temperature,
       status,
       timestamp: new Date(),
       requires_manager_review: status === TemperatureStatus.CRITICAL
     })
     
     return log
   }
   ```

2. Critical Alert System:
   ```typescript
   async sendCriticalTemperatureAlert(area: HACCPTemperatureArea, temperature: number, employeeId: string): Promise<void> {
     const managers = await this.getVenueManagers(area.venue_id)
     
     for (const manager of managers) {
       await this.notificationService.sendEmail({
         to: manager.email,
         subject: `🚨 CRITICAL TEMPERATURE ALERT - ${area.name}`,
         template: 'critical-temperature-alert',
         data: {
           areaName: area.name,
           location: area.location,
           temperature,
           expectedRange: `${area.min_temp}°C - ${area.max_temp}°C`,
           employeeName: await this.getEmployeeName(employeeId),
           timestamp: new Date(),
           actionRequired: 'Immediate review and corrective action required'
         },
         priority: 'CRITICAL'
       })
     }
     
     // Also send SMS for critical alerts
     await this.notificationService.sendSMSAlert(managers, {
       message: `CRITICAL TEMP ALERT: ${area.name} recorded ${temperature}°C. Expected: ${area.min_temp}-${area.max_temp}°C. Review immediately.`,
       priority: 'CRITICAL'
     })
   }
   ```

NOTIFICATION SYSTEM IMPLEMENTATION:
```typescript
// src/notifications/email.service.ts
@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(notification: {
    to: string | string[];
    subject: string;
    template: string;
    data: Record<string, any>;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  }): Promise<NotificationDeliveryResult> {
    try {
      const result = await this.mailerService.sendMail({
        to: notification.to,
        subject: notification.subject,
        template: notification.template,
        context: notification.data,
        priority: notification.priority === 'CRITICAL' ? 'high' : 'normal'
      })

      return {
        success: true,
        messageId: result.messageId,
        sentAt: new Date(),
        deliveryStatus: 'SENT'
      }
    } catch (error) {
      // Retry mechanism for failed emails
      await this.scheduleRetry(notification, error)
      
      return {
        success: false,
        error: error.message,
        retryScheduled: true
      }
    }
  }

  private async scheduleRetry(notification: any, error: Error): Promise<void> {
    // Add to retry queue with exponential backoff
    await this.notificationQueue.add('retry-email', {
      ...notification,
      retryCount: (notification.retryCount || 0) + 1,
      lastError: error.message
    }, {
      delay: Math.pow(2, notification.retryCount || 0) * 60000, // 1, 2, 4, 8 minutes
      attempts: 5
    })
  }
}
```

SCHEDULED TASKS IMPLEMENTATION:
```typescript
// src/scheduled-tasks/certification-check.task.ts
@Injectable()
export class CertificationCheckTask {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly notificationService: NotificationService
  ) {}

  @Cron('0 9 * * *') // Daily at 9 AM
  async checkCertificationExpiry(): Promise<void> {
    console.log('Running certification expiry check...')
    
    const venues = await this.getActiveVenues()
    
    for (const venue of venues) {
      const employees = await this.employeesService.findExpiringCertifications(venue.id, {
        daysAhead: 30 // Check 30 days in advance
      })
      
      for (const employee of employees) {
        const daysUntilExpiry = this.calculateDaysUntilExpiry(employee.certification_expiry)
        
        if (daysUntilExpiry <= 7) {
          // Critical - expires within 7 days
          await this.sendCriticalCertificationAlert(employee, daysUntilExpiry)
        } else if (daysUntilExpiry <= 30) {
          // Warning - expires within 30 days
          await this.sendCertificationReminder(employee, daysUntilExpiry)
        }
      }
    }
    
    console.log('Certification expiry check completed')
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async checkOverdueHACCPChecks(): Promise<void> {
    console.log('Checking for overdue HACCP temperature checks...')
    
    const overdueAreas = await this.haccpService.findOverdueTemperatureChecks()
    
    for (const area of overdueAreas) {
      await this.notificationService.sendOverdueHACCPAlert(area)
    }
  }
}
```

API ENDPOINTS OBBLIGATORI:
```
# Employee Management
POST   /api/v1/venues/{venueId}/employees                    # Create employee
GET    /api/v1/venues/{venueId}/employees                    # List employees
GET    /api/v1/venues/{venueId}/employees/{id}               # Get employee details
PATCH  /api/v1/venues/{venueId}/employees/{id}               # Update employee
DELETE /api/v1/venues/{venueId}/employees/{id}               # Deactivate employee

# Time Clock System
POST   /api/v1/venues/{venueId}/employees/clock              # Clock in/out/break
GET    /api/v1/venues/{venueId}/employees/{id}/timesheet     # Get timesheet
GET    /api/v1/venues/{venueId}/employees/{id}/clock-history # Clock history

# Shift Management  
POST   /api/v1/venues/{venueId}/employees/shifts             # Create shift
GET    /api/v1/venues/{venueId}/employees/shifts             # List shifts
PATCH  /api/v1/venues/{venueId}/employees/shifts/{id}        # Update shift
DELETE /api/v1/venues/{venueId}/employees/shifts/{id}        # Cancel shift

# HACCP Compliance
POST   /api/v1/venues/{venueId}/haccp/temperature-areas      # Create temp area
GET    /api/v1/venues/{venueId}/haccp/temperature-areas      # List temp areas
POST   /api/v1/venues/{venueId}/haccp/temperature-logs       # Log temperature
GET    /api/v1/venues/{venueId}/haccp/temperature-logs       # List logs
PATCH  /api/v1/venues/{venueId}/haccp/temperature-logs/{id}/approve # Manager approve
GET    /api/v1/venues/{venueId}/haccp/dashboard               # HACCP dashboard
GET    /api/v1/venues/{venueId}/haccp/compliance-report      # Compliance report

# Maintenance System
POST   /api/v1/venues/{venueId}/maintenance/tickets          # Create ticket
GET    /api/v1/venues/{venueId}/maintenance/tickets          # List tickets
PATCH  /api/v1/venues/{venueId}/maintenance/tickets/{id}     # Update ticket
POST   /api/v1/venues/{venueId}/maintenance/tickets/{id}/assign # Assign ticket

# Notifications
POST   /api/v1/venues/{venueId}/notifications/send           # Send manual notification
GET    /api/v1/venues/{venueId}/notifications                # List notifications
PATCH  /api/v1/venues/{venueId}/notifications/{id}/read      # Mark as read
```

CRITERI DI COMPLETAMENTO:
- Comando `npm run start:dev` funziona senza errori
- Swagger docs aggiornati con tutti gli endpoint Fase 4
- Email service configurato con MailHog per development
- Time clock sequence validation funziona correttamente
- HACCP temperature alerts triggerano email < 1 minuto
- Scheduled tasks eseguono senza errori
- QR code generation per mobile HACCP checks
- Employee timesheet calculation accurata
- Authorization role-based funziona (employee/manager/admin)
- Performance: employee ops < 200ms, HACCP < 100ms, notifications < 500ms

TEST VALIDATION OBBLIGATORI:
```bash
# Test employee creation and clock in
curl -X POST http://localhost:3000/api/v1/venues/{venue-id}/employees \
  -H "Authorization: Bearer {token}" \
  -d '{"employee_code":"EMP001","first_name":"John","last_name":"Doe","hire_date":"2024-01-01","contract_type":"full_time","hourly_rate":15.50}'

# Test clock in sequence
curl -X POST http://localhost:3000/api/v1/venues/{venue-id}/employees/clock \
  -H "Authorization: Bearer {token}" \
  -d '{"employee_id":"...","type":"clock_in","location":"Main Entrance"}'

# Test invalid clock sequence (should fail)
curl -X POST http://localhost:3000/api/v1/venues/{venue-id}/employees/clock \
  -H "Authorization: Bearer {token}" \
  -d '{"employee_id":"...","type":"break_start","location":"Office"}' # Should fail if not clocked in

# Test HACCP temperature logging
curl -X POST http://localhost:3000/api/v1/venues/{venue-id}/haccp/temperature-logs \
  -H "Authorization: Bearer {token}" \
  -d '{"area_id":"...","temperature":25.5,"notes":"Normal check"}'

# Test critical temperature alert
curl -X POST http://localhost:3000/api/v1/venues/{venue-id}/haccp/temperature-logs \
  -H "Authorization: Bearer {token}" \
  -d '{"area_id":"...","temperature":10.0,"notes":"Critical temp!"}' # Should trigger email alert

# Test HACCP dashboard
curl -X GET http://localhost:3000/api/v1/venues/{venue-id}/haccp/dashboard \
  -H "Authorization: Bearer {token}"

# Test timesheet generation
curl -X GET http://localhost:3000/api/v1/venues/{venue-id}/employees/{emp-id}/timesheet?date=2024-12-01 \
  -H "Authorization: Bearer {token}"
```

MAILHOG SETUP (Development Email):
```yaml
# docker-compose.yml addition
services:
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    environment:
      - MH_STORAGE=maildir
      - MH_MAILDIR_PATH=/maildir
    volumes:
      - ./mailhog/maildir:/maildir
```

EMAIL TEMPLATE SETUP:
```typescript
// src/notifications/templates/critical-temperature-alert.hbs
<!DOCTYPE html>
<html>
<head>
    <title>🚨 Critical Temperature Alert</title>
</head>
<body>
    <h1 style="color: #dc2626;">🚨 CRITICAL TEMPERATURE ALERT</h1>
    
    <p><strong>Area:</strong> {{areaName}} ({{location}})</p>
    <p><strong>Temperature Recorded:</strong> <span style="color: #dc2626; font-size: 18px;">{{temperature}}°C</span></p>
    <p><strong>Expected Range:</strong> {{expectedRange}}</p>
    <p><strong>Recorded By:</strong> {{employeeName}}</p>
    <p><strong>Time:</strong> {{timestamp}}</p>
    
    <div style="background-color: #fee2e2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
        <h3>⚠️ IMMEDIATE ACTION REQUIRED</h3>
        <p>{{actionRequired}}</p>
    </div>
    
    <p>Please review this incident immediately and take corrective action.</p>
    
    <p>Best regards,<br>BeerFlow HACCP Monitoring System</p>
</body>
</html>
```

OUTPUT RICHIESTO:
1. Lista completa di tutti i file creati con contenuto completo
2. Comandi installazione dipendenze eseguiti
3. Steps configurazione MailHog per email testing
4. Test completo time clock sequence validation
5. Test HACCP critical temperature alert con email delivery
6. Screenshot email ricevuta in MailHog
7. Timesheet report generato correttamente
8. Scheduled tasks logs funzionanti

NON DEVIARE da business rules specificate. NON permettere time clock sequences invalide. NON permettere HACCP critical events senza alert. Implementa ESATTAMENTE la business logic documentata con compliance HACCP rigorosa.
```

### PROMPT 2: FASE_4_TESTING
```
PROMPT PER JULES - FASE 4 TESTING BUSINESS LOGIC & COMPLIANCE COMPLETO

CONTESTO:
Hai implementato Employee Portal & HACCP Compliance System (Fase 4). Ora devi creare test suite specializzata per validare business logic critica time tracking, HACCP compliance automatica, notification delivery e scheduled tasks automation.

OBIETTIVO:
Implementare TUTTI i test specificati in FASE_4_TESTING.md con focus particolare su time clock validation, HACCP compliance workflows, notification delivery garantita e business logic integrity.

TASK SPECIFICI:
1. Setup test environment con email testing e scheduled tasks mocking
2. Implementa unit tests per Employee Service con time clock validation completa
3. Crea integration tests per HACCP compliance workflow con critical alerts
4. Implementa notification tests per email delivery reliability e retry mechanisms
5. Crea performance tests per employee operations e HACCP monitoring
6. Implementa business logic validation per time tracking e compliance workflows
7. Setup end-to-end tests per complete employee lifecycle
8. Configura scheduled tasks testing con mocking temporale
9. Setup coverage requirements >= 90% con business logic >= 95%

TEST REQUIREMENTS CRITICI:
- Time Clock Logic: TUTTE le sequenze testate (valid + invalid transitions)
- HACCP Compliance: Critical temperature alerts delivery garantita
- Notification System: Email delivery tracking e retry mechanisms testati
- Scheduled Tasks: Cron jobs automation testati con time mocking
- Performance: Employee operations sotto threshold definiti
- Business Logic: Edge cases (certification expiry, overtime limits, critical temps)
- Authorization: Role-based access e venue isolation validation

UNIT TESTS OBBLIGATORI:
```typescript
// src/employees/employees.service.spec.ts
describe('EmployeesService', () => {
  // Time Clock Business Logic Tests
  it('should allow valid clock in sequence from no previous entry')
  it('should allow clock out after clock in')
  it('should allow break start after clock in')
  it('should allow break end after break start')
  it('should prevent break start without clock in')
  it('should prevent clock out without clock in')
  it('should prevent multiple consecutive clock ins')
  it('should prevent break end without break start')
  
  // Overtime Calculation Tests
  it('should calculate regular hours correctly for 8-hour shift')
  it('should calculate overtime hours for shifts > 8 hours')
  it('should handle multiple break periods correctly')
  it('should calculate cross-midnight shifts correctly')
  
  // Shift Management Tests
  it('should prevent shift conflicts for same employee')
  it('should allow concurrent shifts for different employees')
  it('should validate shift duration limits')
  it('should calculate shift costs with overtime rates')
  
  // Certification Tracking Tests
  it('should identify certifications expiring within 30 days')
  it('should identify expired certifications')
  it('should calculate certification expiry correctly')
})

// src/employees/time-clock.service.spec.ts
describe('TimeClockService', () => {
  describe('validateClockSequence', () => {
    it('should validate correct sequence: null → CLOCK_IN', async () => {
      mockGetLastClockEntry.mockResolvedValue(null)
      const result = await service.validateClockSequence('emp-id', TimeClockType.CLOCK_IN)
      expect(result).toBe(true)
    })
    
    it('should validate correct sequence: CLOCK_IN → BREAK_START', async () => {
      mockGetLastClockEntry.mockResolvedValue({ type: TimeClockType.CLOCK_IN })
      const result = await service.validateClockSequence('emp-id', TimeClockType.BREAK_START)
      expect(result).toBe(true)
    })
    
    it('should reject invalid sequence: null → BREAK_START', async () => {
      mockGetLastClockEntry.mockResolvedValue(null)
      await expect(service.validateClockSequence('emp-id', TimeClockType.BREAK_START))
        .rejects.toThrow('Must clock in first')
    })
    
    it('should reject invalid sequence: CLOCK_IN → BREAK_END', async () => {
      mockGetLastClockEntry.mockResolvedValue({ type: TimeClockType.CLOCK_IN })
      const result = await service.validateClockSequence('emp-id', TimeClockType.BREAK_END)
      expect(result).toBe(false)
    })
  })
  
  describe('calculateDailyHours', () => {
    it('should calculate 8 hours regular for standard shift', async () => {
      const entries = [
        { type: TimeClockType.CLOCK_IN, timestamp: new Date('2024-01-01T09:00:00Z') },
        { type: TimeClockType.CLOCK_OUT, timestamp: new Date('2024-01-01T17:00:00Z') }
      ]
      mockGetDailyClockEntries.mockResolvedValue(entries)
      
      const result = await service.calculateDailyHours('emp-id', new Date('2024-01-01'))
      expect(result.regularHours).toBe(8)
      expect(result.overtimeHours).toBe(0)
      expect(result.totalHours).toBe(8)
    })
    
    it('should calculate overtime for 10-hour shift', async () => {
      const entries = [
        { type: TimeClockType.CLOCK_IN, timestamp: new Date('2024-01-01T08:00:00Z') },
        { type: TimeClockType.CLOCK_OUT, timestamp: new Date('2024-01-01T18:00:00Z') }
      ]
      mockGetDailyClockEntries.mockResolvedValue(entries)
      
      const result = await service.calculateDailyHours('emp-id', new Date('2024-01-01'))
      expect(result.regularHours).toBe(8)
      expect(result.overtimeHours).toBe(2)
      expect(result.totalHours).toBe(10)
    })
  })
})
```

HACCP COMPLIANCE TESTS OBBLIGATORI:
```typescript
// src/haccp/haccp.service.spec.ts
describe('HACCPService', () => {
  // Temperature Status Detection Tests
  it('should detect normal temperature within range', async () => {
    const area = { min_temp: 2, max_temp: 8 }
    const result = await service.determineTemperatureStatus(area, 5)
    expect(result).toBe(TemperatureStatus.NORMAL)
  })
  
  it('should detect warning temperature near limits', async () => {
    const area = { min_temp: 2, max_temp: 8 }
    const result = await service.determineTemperatureStatus(area, 1) // < min_temp + 2
    expect(result).toBe(TemperatureStatus.WARNING)
  })
  
  it('should detect critical temperature outside range', async () => {
    const area = { min_temp: 2, max_temp: 8 }
    const result = await service.determineTemperatureStatus(area, 10) // > max_temp
    expect(result).toBe(TemperatureStatus.CRITICAL)
  })
  
  // Critical Alert Tests
  it('should trigger notification for critical temperature', async () => {
    const area = mockTemperatureArea({ min_temp: 2, max_temp: 8, is_critical: true })
    mockNotificationService.sendCriticalTemperatureAlert = jest.fn()
    
    await service.logTemperature(area.id, 15, 'emp-id') // Critical temp
    
    expect(mockNotificationService.sendCriticalTemperatureAlert)
      .toHaveBeenCalledWith(area, 15, 'emp-id')
  })
  
  it('should not trigger notification for normal temperature', async () => {
    const area = mockTemperatureArea({ min_temp: 2, max_temp: 8 })
    mockNotificationService.sendCriticalTemperatureAlert = jest.fn()
    
    await service.logTemperature(area.id, 5, 'emp-id') // Normal temp
    
    expect(mockNotificationService.sendCriticalTemperatureAlert)
      .not.toHaveBeenCalled()
  })
  
  // Compliance Dashboard Tests
  it('should calculate compliance score correctly', async () => {
    const logs = [
      mockTemperatureLog({ status: TemperatureStatus.NORMAL }),
      mockTemperatureLog({ status: TemperatureStatus.NORMAL }),
      mockTemperatureLog({ status: TemperatureStatus.WARNING }),
      mockTemperatureLog({ status: TemperatureStatus.CRITICAL })
    ]
    
    const score = await service.calculateComplianceScore(logs)
    expect(score).toBe(75) // 3/4 acceptable (normal + warning)
  })
  
  // Overdue Checks Tests
  it('should identify areas with overdue temperature checks', async () => {
    const area = mockTemperatureArea({ 
      check_frequency_hours: 2,
      last_check: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
    })
    
    const overdueAreas = await service.findOverdueTemperatureChecks()
    expect(overdueAreas).toContain(area)
  })
})
```

NOTIFICATION SYSTEM TESTS OBBLIGATORI:
```typescript
// src/notifications/email.service.spec.ts
describe('EmailService', () => {
  // Email Delivery Tests
  it('should send email successfully', async () => {
    mockMailerService.sendMail.mockResolvedValue({ messageId: 'test-123' })
    
    const result = await service.sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      template: 'test-template',
      data: { name: 'John' }
    })
    
    expect(result.success).toBe(true)
    expect(result.messageId).toBe('test-123')
    expect(result.deliveryStatus).toBe('SENT')
  })
  
  it('should handle email delivery failure and schedule retry', async () => {
    mockMailerService.sendMail.mockRejectedValue(new Error('SMTP Error'))
    mockNotificationQueue.add = jest.fn()
    
    const result = await service.sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      template: 'test-template',
      data: { name: 'John' }
    })
    
    expect(result.success).toBe(false)
    expect(result.retryScheduled).toBe(true)
    expect(mockNotificationQueue.add).toHaveBeenCalledWith('retry-email', expect.any(Object), expect.any(Object))
  })
  
  // Critical Alert Delivery Tests
  it('should send critical temperature alert with high priority', async () => {
    const area = mockTemperatureArea({ name: 'Freezer 1' })
    
    await service.sendCriticalTemperatureAlert(area, 15, 'emp-id')
    
    expect(mockMailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('CRITICAL TEMPERATURE ALERT'),
        priority: 'high'
      })
    )
  })
  
  // Retry Mechanism Tests
  it('should implement exponential backoff for retries', async () => {
    const notification = { 
      to: 'test@example.com',
      retryCount: 2 
    }
    
    await service.scheduleRetry(notification, new Error('Test error'))
    
    expect(mockNotificationQueue.add).toHaveBeenCalledWith(
      'retry-email',
      expect.objectContaining({ retryCount: 3 }),
      expect.objectContaining({ delay: 4 * 60000 }) // 4 minutes for retry 2
    )
  })
})
```

SCHEDULED TASKS TESTS OBBLIGATORI:
```typescript
// src/scheduled-tasks/certification-check.task.spec.ts
describe('CertificationCheckTask', () => {
  beforeEach(() => {
    // Mock current date for predictable testing
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T09:00:00Z'))
  })
  
  afterEach(() => {
    jest.useRealTimers()
  })
  
  it('should identify employees with certifications expiring in 7 days', async () => {
    const expiringEmployee = mockEmployee({
      certification_expiry: new Date('2024-01-22') // 7 days from now
    })
    mockEmployeesService.findExpiringCertifications.mockResolvedValue([expiringEmployee])
    mockNotificationService.sendCriticalCertificationAlert = jest.fn()
    
    await task.checkCertificationExpiry()
    
    expect(mockNotificationService.sendCriticalCertificationAlert)
      .toHaveBeenCalledWith(expiringEmployee, 7)
  })
  
  it('should send reminder for certifications expiring in 30 days', async () => {
    const expiringEmployee = mockEmployee({
      certification_expiry: new Date('2024-02-14') // 30 days from now
    })
    mockEmployeesService.findExpiringCertifications.mockResolvedValue([expiringEmployee])
    mockNotificationService.sendCertificationReminder = jest.fn()
    
    await task.checkCertificationExpiry()
    
    expect(mockNotificationService.sendCertificationReminder)
      .toHaveBeenCalledWith(expiringEmployee, 30)
  })
  
  it('should check for overdue HACCP temperature checks', async () => {
    const overdueArea = mockTemperatureArea({
      name: 'Freezer 1',
      last_check: new Date('2024-01-14T03:00:00Z') // 30 hours ago, overdue
    })
    mockHaccpService.findOverdueTemperatureChecks.mockResolvedValue([overdueArea])
    mockNotificationService.sendOverdueHACCPAlert = jest.fn()
    
    await task.checkOverdueHACCPChecks()
    
    expect(mockNotificationService.sendOverdueHACCPAlert)
      .toHaveBeenCalledWith(overdueArea)
  })
})
```

INTEGRATION TESTS OBBLIGATORI:
```typescript
// test/integration/employee-workflow.integration.spec.ts
describe('Employee Workflow Integration', () => {
  it('should complete full employee shift lifecycle', async () => {
    // 1. Create employee
    const employee = await request(app.getHttpServer())
      .post(`/api/v1/venues/${venueId}/employees`)
      .send(mockCreateEmployeeDto())
      .expect(201)
    
    // 2. Create shift for today
    await request(app.getHttpServer())
      .post(`/api/v1/venues/${venueId}/employees/shifts`)
      .send({
        employee_id: employee.body.id,
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00:00',
        end_time: '17:00:00'
      })
      .expect(201)
    
    // 3. Clock in
    await request(app.getHttpServer())
      .post(`/api/v1/venues/${venueId}/employees/clock`)
      .send({
        employee_id: employee.body.id,
        type: 'clock_in',
        location: 'Main Entrance'
      })
      .expect(201)
    
    // 4. Take break
    await request(app.getHttpServer())
      .post(`/api/v1/venues/${venueId}/employees/clock`)
      .send({
        employee_id: employee.body.id,
        type: 'break_start',
        location: 'Break Room'
      })
      .expect(201)
    
    // 5. End break
    await request(app.getHttpServer())
      .post(`/api/v1/venues/${venueId}/employees/clock`)
      .send({
        employee_id: employee.body.id,
        type: 'break_end',
        location: 'Break Room'
      })
      .expect(201)
    
    // 6. Clock out
    await request(app.getHttpServer())
      .post(`/api/v1/venues/${venueId}/employees/clock`)
      .send({
        employee_id: employee.body.id,
        type: 'clock_out',
        location: 'Main Entrance'
      })
      .expect(201)
    
    // 7. Generate timesheet
    const timesheet = await request(app.getHttpServer())
      .get(`/api/v1/venues/${venueId}/employees/${employee.body.id}/timesheet`)
      .query({ date: new Date().toISOString().split('T')[0] })
      .expect(200)
    
    expect(timesheet.body.totalHours).toBeGreaterThan(0)
    expect(timesheet.body.clockEntries).toHaveLength(4)
  })
  
  it('should prevent invalid clock sequences', async () => {
    const employee = await createTestEmployee()
    
    // Try to break without clocking in - should fail
    await request(app.getHttpServer())
      .post(`/api/v1/venues/${venueId}/employees/clock`)
      .send({
        employee_id: employee.id,
        type: 'break_start',
        location: 'Break Room'
      })
      .expect(400)
      .expect(res => {
        expect(res.body.message).toContain('Must clock in first')
      })
  })
})

// test/integration/haccp-compliance.integration.spec.ts
describe('HACCP Compliance Integration', () => {
  it('should trigger critical alert for temperature out of range', async () => {
    const area = await createTestTemperatureArea({
      min_temp: 2,
      max_temp: 8,
      is_critical: true
    })
    
    const employee = await createTestEmployee()
    
    // Mock email service to capture sent emails
    const emailSpy = jest.spyOn(emailService, 'sendEmail')
    
    // Log critical temperature
    await request(app.getHttpServer())
      .post(`/api/v1/venues/${venueId}/haccp/temperature-logs`)
      .send({
        area_id: area.id,
        temperature: 15, // Critical temperature
        notes: 'Critical temperature detected'
      })
      .expect(201)
    
    // Verify critical alert was sent
    expect(emailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('CRITICAL TEMPERATURE ALERT'),
        priority: 'CRITICAL'
      })
    )
  })
  
  it('should generate accurate compliance dashboard', async () => {
    await createTestTemperatureLogs([
      { status: TemperatureStatus.NORMAL },
      { status: TemperatureStatus.NORMAL },
      { status: TemperatureStatus.WARNING },
      { status: TemperatureStatus.CRITICAL }
    ])
    
    const dashboard = await request(app.getHttpServer())
      .get(`/api/v1/venues/${venueId}/haccp/dashboard`)
      .expect(200)
    
    expect(dashboard.body.complianceScore).toBe(75)
    expect(dashboard.body.criticalEvents).toBe(1)
    expect(dashboard.body.totalChecks).toBe(4)
  })
})
```

PERFORMANCE TESTS OBBLIGATORI:
```typescript
// test/performance/employee-operations.performance.spec.ts
describe('Employee Operations Performance', () => {
  it('should create employee in < 200ms average', async () => {
    const times = []
    for (let i = 0; i < 50; i++) {
      const start = Date.now()
      await employeesService.create(venueId, mockCreateEmployeeDto())
      times.push(Date.now() - start)
    }
    const avg = times.reduce((a, b) => a + b) / times.length
    expect(avg).toBeLessThan(200)
  })
  
  it('should process clock entry in < 100ms average', async () => {
    const employee = await createTestEmployee()
    const times = []
    
    for (let i = 0; i < 100; i++) {
      const start = Date.now()
      await timeClockService.clockIn(employee.id, 'Main Entrance')
      await timeClockService.clockOut(employee.id, 'Main Entrance')
      times.push(Date.now() - start)
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length
    expect(avg).toBeLessThan(100)
  })
  
  it('should handle 20 concurrent employee operations', async () => {
    const employees = await Promise.all(
      Array(20).fill(0).map(() => createTestEmployee())
    )
    
    const start = Date.now()
    
    await Promise.all(employees.map(employee => 
      timeClockService.clockIn(employee.id, 'Main Entrance')
    ))
    
    const duration = Date.now() - start
    expect(duration).toBeLessThan(5000) // < 5s for 20 concurrent operations
  })
})

// test/performance/haccp-operations.performance.spec.ts
describe('HACCP Operations Performance', () => {
  it('should log temperature in < 100ms average', async () => {
    const area = await createTestTemperatureArea()
    const employee = await createTestEmployee()
    const times = []
    
    for (let i = 0; i < 100; i++) {
      const start = Date.now()
      await haccpService.logTemperature(area.id, 5, employee.id)
      times.push(Date.now() - start)
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length
    expect(avg).toBeLessThan(100)
  })
  
  it('should generate HACCP dashboard in < 150ms', async () => {
    await createTestTemperatureLogs(100) // 100 logs for realistic data
    
    const start = Date.now()
    await haccpService.generateDashboard(venueId)
    const duration = Date.now() - start
    
    expect(duration).toBeLessThan(150)
  })
})
```

EMAIL TESTING SETUP:
```typescript
// test/utils/email-test.helper.ts
export class EmailTestHelper {
  private emailSpy: jest.SpyInstance
  
  setup() {
    this.emailSpy = jest.spyOn(emailService, 'sendEmail').mockImplementation(async (notification) => {
      // Store email for verification
      this.sentEmails.push(notification)
      return {
        success: true,
        messageId: `test-${Date.now()}`,
        sentAt: new Date(),
        deliveryStatus: 'SENT'
      }
    })
  }
  
  expectEmailSent(criteria: {
    to?: string;
    subject?: string;
    template?: string;
    priority?: string;
  }) {
    const sentEmail = this.sentEmails.find(email => 
      (!criteria.to || email.to === criteria.to) &&
      (!criteria.subject || email.subject.includes(criteria.subject)) &&
      (!criteria.template || email.template === criteria.template) &&
      (!criteria.priority || email.priority === criteria.priority)
    )
    
    expect(sentEmail).toBeDefined()
    return sentEmail
  }
  
  expectCriticalTemperatureAlert(areaName: string, temperature: number) {
    return this.expectEmailSent({
      subject: 'CRITICAL TEMPERATURE ALERT',
      template: 'critical-temperature-alert',
      priority: 'CRITICAL'
    })
  }
}
```

JEST CONFIGURATION AGGIORNATA:
```json
{
  "testTimeout": 15000,
  "setupFilesAfterEnv": ["<rootDir>/test/setup-phase4.ts"],
  "testPathIgnorePatterns": ["/node_modules/", "/dist/"],
  "collectCoverageFrom": [
    "src/employees/**/*.ts",
    "src/haccp/**/*.ts", 
    "src/notifications/**/*.ts",
    "src/maintenance/**/*.ts",
    "src/scheduled-tasks/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.e2e-spec.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    },
    "src/employees/time-clock.service.ts": {
      "branches": 95,
      "functions": 95, 
      "lines": 95,
      "statements": 95
    },
    "src/haccp/haccp.service.ts": {
      "branches": 95,
      "functions": 95,
      "lines": 95,
      "statements": 95
    }
  }
}
```

PERFORMANCE BENCHMARKS REQUIREMENTS:
- Employee Creation: < 200ms average, > 95% success rate
- Time Clock Operations: < 100ms average, > 98% success rate
- HACCP Temperature Logging: < 100ms average, 100% success rate
- Critical Alert Delivery: < 500ms, 100% delivery rate
- Scheduled Tasks Execution: < 1000ms per task, 100% success rate
- Concurrent Operations: 20 employees < 5s, > 90% success rate

COVERAGE REQUIREMENTS:
- Employees Service: 95% (business logic critica)
- Time Clock Service: 95% (sequenze validation)
- HACCP Service: 95% (compliance critica)
- Notification Service: 90%
- Controllers: 85%
- Scheduled Tasks: 100% (automation critica)

NPM SCRIPTS DA AGGIUNGERE:
```json
{
  "test:phase4:unit": "jest --testPathPattern=\"(employees|haccp|notifications|maintenance).*\\.spec\\.ts$\"",
  "test:phase4:integration": "jest --testPathPattern=\".*\\.integration\\.spec\\.ts$\"",
  "test:phase4:e2e": "jest --testPathPattern=\"employee-workflow|haccp-compliance\"",
  "test:phase4:performance": "jest --testPathPattern=\".*\\.performance\\.spec\\.ts$\"",
  "test:phase4:notifications": "jest --testPathPattern=\"notifications.*\\.spec\\.ts$\"",
  "test:phase4:scheduled": "jest --testPathPattern=\"scheduled-tasks.*\\.spec\\.ts$\"",
  "test:phase4:all": "npm run test:phase4:unit && npm run test:phase4:integration && npm run test:phase4:e2e && npm run test:phase4:performance"
}
```

CRITERI DI COMPLETAMENTO:
- Comando `npm run test:phase4:all` passa al 100%
- Coverage report >= 90% overall, >= 95% business logic critica
- Performance benchmarks tutti rispettati
- Time clock sequence validation copre tutti gli edge cases
- HACCP compliance tests verificano critical alert delivery
- Notification tests validano email delivery e retry mechanisms
- Scheduled tasks testati con time mocking
- Integration tests validano complete employee workflows

Implementa TUTTI i test specificati. Business logic time tracking e HACCP compliance DEVE essere 100% validata. Notification delivery DEVE essere testata con retry mechanisms. Performance DEVE rispettare tutti i benchmark.
```

### PROMPT 3: FASE_4_INTEGRATION
```
PROMPT PER JULES - FASE 4 INTEGRATION & PRODUCTION READINESS COMPLETO

CONTESTO:
Fase 4 implementation e testing completati. Ora devi integrare completamente con tutte le fasi precedenti, setup monitoring avanzato per employee operations e HACCP compliance, configurare email system production-ready e validare complete restaurant management system.

OBIETTIVO:
Integrare completamente Fase 4 con Fasi 1-3, configurare monitoring specializzato per business logic employee management e HACCP compliance, setup email infrastructure production-ready, preparare deployment completo sistema seguendo FASE_4_INTEGRATION.md.

TASK SPECIFICI:
1. Esegui integration tests end-to-end complete restaurant operations workflow
2. Setup monitoring avanzato per employee performance e HACCP compliance metrics
3. Configura email infrastructure production-ready con MailHog → SMTP transition
4. Implementa health checks specializzati per employee system e HACCP compliance
5. Crea deployment scripts con validation automatica completa Fase 4
6. Setup automated backup procedures per employee data e HACCP logs
7. Implementa rollback procedures testate per employee system
8. Configura scheduled tasks clustering per alta disponibilità
9. Valida production readiness sistema restaurant management completo

INTEGRATION REQUIREMENTS COMPLETI:
- End-to-end workflow: Employee → Order Processing → HACCP Compliance → Stock Management
- Employee performance tracking integrato con order management
- HACCP compliance integration con daily operations
- Notification system reliability per critical events
- Scheduled tasks automation per compliance maintenance
- Cross-venue data isolation mantenuto attraverso tutte le fasi

MONITORING SETUP AVANZATO EMPLOYEE & HACCP:
```typescript
// src/common/interceptors/employee-metrics.interceptor.ts
@Injectable()
export class EmployeeMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const startTime = Date.now()
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime
        const endpoint = `${request.method} ${request.route?.path}`
        
        // Track employee-specific metrics
        if (endpoint.includes('/employees')) {
          this.trackEmployeeOperation(endpoint, duration, request)
        }
        
        // Track HACCP-specific metrics
        if (endpoint.includes('/haccp')) {
          this.trackHACCPOperation(endpoint, duration, request)
        }
        
        // Alert on slow operations
        if (duration > 300) {
          this.alertSlowOperation(endpoint, duration, request)
        }
      })
    )
  }

  private trackEmployeeOperation(endpoint: string, duration: number, request: any) {
    const metrics = {
      endpoint,
      duration,
      venueId: request.params.venueId,
      userId: request.user?.id,
      timestamp: new Date(),
      operationType: this.extractOperationType(endpoint)
    }
    
    // Track specific business metrics
    if (endpoint.includes('/clock')) {
      this.trackTimeClockMetrics(request.body.type, duration)
    }
    
    // Track certification operations
    if (endpoint.includes('/certification')) {
      this.trackCertificationMetrics(request.body, duration)
    }
  }

  private trackHACCPOperation(endpoint: string, duration: number, request: any) {
    const metrics = {
      endpoint,
      duration,
      venueId: request.params.venueId,
      timestamp: new Date()
    }
    
    // Track temperature logging performance
    if (endpoint.includes('/temperature-logs')) {
      this.trackTemperatureLogMetrics(request.body, duration)
    }
    
    // Track compliance dashboard performance
    if (endpoint.includes('/dashboard')) {
      this.trackComplianceDashboardMetrics(duration)
    }
  }
}
```

HEALTH CHECKS SPECIALIZZATI EMPLOYEE & HACCP:
```typescript
// src/health/employee-health.indicator.ts
@Injectable()
export class EmployeeHealthIndicator extends HealthIndicator {
  constructor(
    private employeesService: EmployeesService,
    private timeClockService: TimeClockService,
    private haccpService: HACCPService,
    private notificationService: NotificationService
  ) {
    super()
  }

  async isEmployeeSystemHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Test employee operations performance
      const start = Date.now()
      await this.employeesService.testEmployeeOperations()
      const employeeOpsTime = Date.now() - start

      // Test time clock functionality
      const timeClockHealth = await this.testTimeClockSystem()
      
      // Test HACCP compliance system
      const haccpHealth = await this.testHACCPSystem()
      
      // Test notification system
      const notificationHealth = await this.testNotificationSystem()

      const isHealthy = 
        employeeOpsTime < 200 && 
        timeClockHealth.healthy && 
        haccpHealth.healthy &&
        notificationHealth.healthy

      return this.getStatus(key, isHealthy, {
        employeeOperationsTime: employeeOpsTime,
        timeClockSystem: timeClockHealth,
        haccpSystem: haccpHealth,
        notificationSystem: notificationHealth,
        activeEmployees: await this.employeesService.getActiveEmployeeCount(),
        todayClockEntries: await this.timeClockService.getTodayClockEntryCount(),
        pendingHACCPChecks: await this.haccpService.getPendingChecksCount()
      })
    } catch (error) {
      return this.getStatus(key, false, { error: error.message })
    }
  }

  private async testTimeClockSystem(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Test clock sequence validation
      const testValidation = await this.timeClockService.testSequenceValidation()
      
      // Test overtime calculation
      const testOvertimeCalc = await this.timeClockService.testOvertimeCalculation()
      
      return {
        healthy: testValidation && testOvertimeCalc,
        details: {
          sequenceValidation: testValidation,
          overtimeCalculation: testOvertimeCalc
        }
      }
    } catch (error) {
      return { healthy: false, details: { error: error.message } }
    }
  }

  private async testHACCPSystem(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Test temperature status detection
      const tempStatusTest = await this.haccpService.testTemperatureStatusDetection()
      
      // Test compliance scoring
      const complianceTest = await this.haccpService.testComplianceScoring()
      
      // Test overdue check detection
      const overdueTest = await this.haccpService.testOverdueCheckDetection()

      return {
        healthy: tempStatusTest && complianceTest && overdueTest,
        details: {
          temperatureStatus: tempStatusTest,
          complianceScoring: complianceTest,
          overdueDetection: overdueTest
        }
      }
    } catch (error) {
      return { healthy: false, details: { error: error.message } }
    }
  }

  private async testNotificationSystem(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Test email connectivity
      const emailTest = await this.notificationService.testEmailConnectivity()
      
      // Test notification queue
      const queueTest = await this.notificationService.testNotificationQueue()
      
      return {
        healthy: emailTest && queueTest,
        details: {
          emailConnectivity: emailTest,
          notificationQueue: queueTest,
          pendingNotifications: await this.notificationService.getPendingNotificationCount()
        }
      }
    } catch (error) {
      return { healthy: false, details: { error: error.message } }
    }
  }
}
```

EMAIL INFRASTRUCTURE PRODUCTION SETUP:
```typescript
// src/config/email.config.ts
import { registerAs } from '@nestjs/config'

export default registerAs('email', () => ({
  transport: {
    host: process.env.EMAIL_HOST || 'localhost',
    port: parseInt(process.env.EMAIL_PORT) || 1025,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  },
  defaults: {
    from: process.env.EMAIL_FROM || 'noreply@beerflow.com'
  },
  templates: {
    dir: process.env.EMAIL_TEMPLATES_DIR || './src/notifications/templates',
    adapter: 'handlebars',
    options: {
      strict: true
    }
  },
  // Production SMTP Configuration
  production: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  // Critical alert configuration
  criticalAlerts: {
    maxRetries: 5,
    retryDelay: 60000, // 1 minute
    escalationDelay: 300000, // 5 minutes
    backupRecipients: process.env.CRITICAL_BACKUP_EMAILS?.split(',') || []
  }
}))

// src/notifications/email-production.service.ts
@Injectable()
export class EmailProductionService extends EmailService {
  async sendCriticalAlert(notification: CriticalNotification): Promise<void> {
    let attempt = 0
    const maxAttempts = this.configService.get('email.criticalAlerts.maxRetries')
    
    while (attempt < maxAttempts) {
      try {
        await this.sendEmail(notification)
        await this.logSuccessfulDelivery(notification)
        return
      } catch (error) {
        attempt++
        this.logger.error(`Critical alert delivery failed (attempt ${attempt}/${maxAttempts}): ${error.message}`)
        
        if (attempt === maxAttempts) {
          // Final attempt failed - escalate
          await this.escalateCriticalAlert(notification, error)
        } else {
          // Wait before retry
          await this.delay(this.configService.get('email.criticalAlerts.retryDelay'))
        }
      }
    }
  }

  private async escalateCriticalAlert(notification: CriticalNotification, originalError: Error): Promise<void> {
    const backupRecipients = this.configService.get('email.criticalAlerts.backupRecipients')
    
    // Send escalation alert to backup recipients
    await this.sendEmail({
      ...notification,
      to: backupRecipients,
      subject: `🚨 ESCALATED: ${notification.subject}`,
      template: 'escalated-critical-alert',
      data: {
        ...notification.data,
        originalError: originalError.message,
        escalationReason: 'Primary notification delivery failed after maximum retries'
      }
    })
    
    // Log critical failure
    this.logger.error(`CRITICAL ALERT ESCALATION: ${notification.subject}`, {
      originalRecipients: notification.to,
      backupRecipients,
      originalError: originalError.message
    })
  }
}
```

SCHEDULED TASKS CLUSTERING:
```typescript
// src/scheduled-tasks/distributed-tasks.service.ts
@Injectable()
export class DistributedTasksService {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService
  ) {}

  async acquireTaskLock(taskName: string, duration: number = 60000): Promise<boolean> {
    const lockKey = `task:lock:${taskName}`
    const lockValue = `${process.env.HOSTNAME || 'unknown'}:${Date.now()}`
    
    const result = await this.redisService.set(lockKey, lockValue, 'PX', duration, 'NX')
    return result === 'OK'
  }

  async releaseTaskLock(taskName: string): Promise<void> {
    const lockKey = `task:lock:${taskName}`
    await this.redisService.del(lockKey)
  }

  async withDistributedLock<T>(
    taskName: string, 
    task: () => Promise<T>,
    lockDuration: number = 60000
  ): Promise<T | null> {
    const acquired = await this.acquireTaskLock(taskName, lockDuration)
    
    if (!acquired) {
      this.logger.log(`Task ${taskName} already running on another instance, skipping`)
      return null
    }

    try {
      this.logger.log(`Acquired lock for task ${taskName}, executing...`)
      const result = await task()
      this.logger.log(`Task ${taskName} completed successfully`)
      return result
    } catch (error) {
      this.logger.error(`Task ${taskName} failed: ${error.message}`)
      throw error
    } finally {
      await this.releaseTaskLock(taskName)
      this.logger.log(`Released lock for task ${taskName}`)
    }
  }
}

// Updated scheduled tasks with clustering
@Injectable()
export class DistributedCertificationCheckTask extends CertificationCheckTask {
  constructor(
    private readonly distributedTasksService: DistributedTasksService,
    ...parentDependencies
  ) {
    super(...parentDependencies)
  }

  @Cron('0 9 * * *') // Daily at 9 AM
  async checkCertificationExpiry(): Promise<void> {
    await this.distributedTasksService.withDistributedLock(
      'certification-check',
      () => super.checkCertificationExpiry(),
      300000 // 5 minute lock
    )
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async checkOverdueHACCPChecks(): Promise<void> {
    await this.distributedTasksService.withDistributedLock(
      'haccp-overdue-check',
      () => super.checkOverdueHACCPChecks(),
      180000 // 3 minute lock
    )
  }
}
```

PROMETHEUS METRICS AVANZATE:
```typescript
// src/metrics/restaurant-metrics.service.ts
@Injectable()
export class RestaurantMetricsService {
  // Employee Metrics
  private readonly employeeClockOperations = new prometheus.Counter({
    name: 'beerflow_employee_clock_operations_total',
    help: 'Total number of employee clock operations',
    labelNames: ['venue_id', 'operation_type', 'status']
  })

  private readonly employeeShiftDuration = new prometheus.Histogram({
    name: 'beerflow_employee_shift_duration_hours',
    help: 'Employee shift duration in hours',
    labelNames: ['venue_id', 'employee_id', 'shift_type'],
    buckets: [4, 6, 8, 10, 12, 16, 24]
  })

  private readonly employeeOvertimeHours = new prometheus.Gauge({
    name: 'beerflow_employee_overtime_hours_daily',
    help: 'Employee overtime hours per day',
    labelNames: ['venue_id', 'employee_id', 'date']
  })

  // HACCP Metrics
  private readonly haccpTemperatureChecks = new prometheus.Counter({
    name: 'beerflow_haccp_temperature_checks_total',
    help: 'Total HACCP temperature checks',
    labelNames: ['venue_id', 'area_id', 'status']
  })

  private readonly haccpComplianceScore = new prometheus.Gauge({
    name: 'beerflow_haccp_compliance_score_percent',
    help: 'HACCP compliance score percentage',
    labelNames: ['venue_id', 'period']
  })

  private readonly haccpCriticalAlerts = new prometheus.Counter({
    name: 'beerflow_haccp_critical_alerts_total',
    help: 'Total HACCP critical temperature alerts',
    labelNames: ['venue_id', 'area_id', 'alert_type']
  })

  // Notification Metrics
  private readonly notificationsSent = new prometheus.Counter({
    name: 'beerflow_notifications_sent_total',
    help: 'Total notifications sent',
    labelNames: ['venue_id', 'type', 'channel', 'status']
  })

  private readonly notificationDeliveryTime = new prometheus.Histogram({
    name: 'beerflow_notification_delivery_duration_seconds',
    help: 'Notification delivery time',
    labelNames: ['type', 'channel'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  })

  // Business Metrics
  private readonly dailyOperationsScore = new prometheus.Gauge({
    name: 'beerflow_daily_operations_score',
    help: 'Daily operations efficiency score',
    labelNames: ['venue_id', 'date']
  })

  // Method implementations
  trackEmployeeClockOperation(venueId: string, operationType: string, status: 'success' | 'error') {
    this.employeeClockOperations.labels(venueId, operationType, status).inc()
  }

  trackEmployeeShift(venueId: string, employeeId: string, shiftType: string, durationHours: number) {
    this.employeeShiftDuration.labels(venueId, employeeId, shiftType).observe(durationHours)
  }

  trackHACCPTemperatureCheck(venueId: string, areaId: string, status: string) {
    this.haccpTemperatureChecks.labels(venueId, areaId, status).inc()
  }

  updateHACCPComplianceScore(venueId: string, period: string, score: number) {
    this.haccpComplianceScore.labels(venueId, period).set(score)
  }

  trackCriticalAlert(venueId: string, areaId: string, alertType: string) {
    this.haccpCriticalAlerts.labels(venueId, areaId, alertType).inc()
  }

  trackNotificationSent(venueId: string, type: string, channel: string, status: string, duration: number) {
    this.notificationsSent.labels(venueId, type, channel, status).inc()
    this.notificationDeliveryTime.labels(type, channel).observe(duration / 1000)
  }
}
```

GRAFANA DASHBOARD RESTAURANT MANAGEMENT:
```json
{
  "dashboard": {
    "title": "BeerFlow Complete Restaurant Management",
    "panels": [
      {
        "title": "Employee Operations Overview",
        "type": "row"
      },
      {
        "title": "Clock Operations per Hour",
        "type": "graph",
        "targets": [{
          "expr": "rate(beerflow_employee_clock_operations_total[1h])",
          "legendFormat": "{{operation_type}} - {{status}}"
        }]
      },
      {
        "title": "Employee Shift Duration Distribution",
        "type": "heatmap",
        "targets": [{
          "expr": "beerflow_employee_shift_duration_hours_bucket",
          "legendFormat": "{{shift_type}}"
        }]
      },
      {
        "title": "Daily Overtime Hours by Employee",
        "type": "graph",
        "targets": [{
          "expr": "beerflow_employee_overtime_hours_daily",
          "legendFormat": "{{employee_id}}"
        }]
      },
      {
        "title": "HACCP Compliance Overview",
        "type": "row"
      },
      {
        "title": "Temperature Checks Status",
        "type": "piechart",
        "targets": [{
          "expr": "beerflow_haccp_temperature_checks_total",
          "legendFormat": "{{status}}"
        }]
      },
      {
        "title": "HACCP Compliance Score",
        "type": "singlestat",
        "targets": [{
          "expr": "beerflow_haccp_compliance_score_percent",
          "legendFormat": "Compliance Score"
        }]
      },
      {
        "title": "Critical Alerts Rate",
        "type": "graph",
        "targets": [{
          "expr": "rate(beerflow_haccp_critical_alerts_total[5m])",
          "legendFormat": "{{area_id}} - {{alert_type}}"
        }]
      },
      {
        "title": "Notification System Performance",
        "type": "row"
      },
      {
        "title": "Notification Delivery Success Rate",
        "type": "stat",
        "targets": [{
          "expr": "rate(beerflow_notifications_sent_total{status=\"success\"}[5m]) / rate(beerflow_notifications_sent_total[5m]) * 100",
          "legendFormat": "Success Rate %"
        }]
      },
      {
        "title": "Notification Delivery Time",
        "type": "graph",
        "targets": [{
          "expr": "histogram_quantile(0.95, beerflow_notification_delivery_duration_seconds_bucket)",
          "legendFormat": "95th percentile"
        }]
      },
      {
        "title": "Restaurant Operations Summary",
        "type": "row"
      },
      {
        "title": "Daily Operations Score",
        "type": "graph",
        "targets": [{
          "expr": "beerflow_daily_operations_score",
          "legendFormat": "{{venue_id}}"
        }]
      }
    ]
  }
}
```

DEPLOYMENT VALIDATION COMPLETO:
```bash
#!/bin/bash
# scripts/validate-complete-system.sh

set -euo pipefail

print_title() { echo -e "\n🔍 $1"; }
print_success() { echo "✅ $1"; }
print_error() { echo "❌ $1"; exit 1; }

print_title "BeerFlow Complete System Validation"

# Verify environment variables
required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
  "EMAIL_HOST"
  "EMAIL_USER"
  "EMAIL_PASS"
  "REDIS_URL"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    print_error "Required environment variable $var is not set"
  fi
done

print_success "Environment variables validated"

# Health checks for all systems
print_title "Validating system health..."

# Overall health check
HEALTH_STATUS=$(curl -s http://localhost:3000/health | jq -r '.status // "error"')
if [ "$HEALTH_STATUS" != "ok" ]; then
    print_error "Overall health check failed"
fi

# Employee system health
EMPLOYEE_HEALTH=$(curl -s http://localhost:3000/health | jq -r '.details.employee.status // "error"')
if [ "$EMPLOYEE_HEALTH" != "up" ]; then
    print_error "Employee system health check failed"
fi

# HACCP system health
HACCP_HEALTH=$(curl -s http://localhost:3000/health | jq -r '.details.haccp.status // "error"')
if [ "$HACCP_HEALTH" != "up" ]; then
    print_error "HACCP system health check failed"
fi

# Notification system health
NOTIFICATION_HEALTH=$(curl -s http://localhost:3000/health | jq -r '.details.notifications.status // "error"')
if [ "$NOTIFICATION_HEALTH" != "up" ]; then
    print_error "Notification system health check failed"
fi

print_success "All health checks passed"

# Test complete restaurant workflow
print_title "Testing complete restaurant workflow..."

# 1. Create employee
EMPLOYEE_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_code":"DEPLOY-CHEF-001",
    "first_name":"Marco",
    "last_name":"Chef",
    "hire_date":"2024-01-01",
    "contract_type":"full_time",
    "hourly_rate":18.00,
    "position":"chef"
  }' \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/employees" | \
  jq -r '.id // "null"')

if [ "$EMPLOYEE_ID" = "null" ]; then
    print_error "Employee creation failed"
fi

print_success "Employee created: $EMPLOYEE_ID"

# 2. Employee clock in
CLOCK_IN_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employee_id\":\"$EMPLOYEE_ID\",
    \"type\":\"clock_in\",
    \"location\":\"Kitchen Entrance\"
  }" \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/employees/clock" | \
  jq -r '.id // "null"')

if [ "$CLOCK_IN_ID" = "null" ]; then
    print_error "Employee clock in failed"
fi

print_success "Employee clocked in: $CLOCK_IN_ID"

# 3. Create HACCP temperature area
TEMP_AREA_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Deployment Test Freezer",
    "location":"Kitchen Area A",
    "min_temp":-2,
    "max_temp":5,
    "check_frequency_hours":2,
    "is_critical":true
  }' \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/haccp/temperature-areas" | \
  jq -r '.id // "null"')

if [ "$TEMP_AREA_ID" = "null" ]; then
    print_error "HACCP temperature area creation failed"
fi

print_success "HACCP temperature area created: $TEMP_AREA_ID"

# 4. Log normal temperature
TEMP_LOG_NORMAL=$(curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"area_id\":\"$TEMP_AREA_ID\",
    \"temperature\":3.5,
    \"notes\":\"Deployment test - normal temperature\"
  }" \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/haccp/temperature-logs" | \
  jq -r '.id // "null"')

if [ "$TEMP_LOG_NORMAL" = "null" ]; then
    print_error "Normal temperature logging failed"
fi

print_success "Normal temperature logged: $TEMP_LOG_NORMAL"

# 5. Log critical temperature (should trigger alert)
print_title "Testing critical temperature alert system..."

TEMP_LOG_CRITICAL=$(curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"area_id\":\"$TEMP_AREA_ID\",
    \"temperature\":15.0,
    \"notes\":\"Deployment test - CRITICAL TEMPERATURE\"
  }" \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/haccp/temperature-logs" | \
  jq -r '.id // "null"')

if [ "$TEMP_LOG_CRITICAL" = "null" ]; then
    print_error "Critical temperature logging failed"
fi

print_success "Critical temperature logged: $TEMP_LOG_CRITICAL"

# Wait for alert processing
echo "⏳ Waiting for critical alert processing..."
sleep 5

# 6. Check HACCP dashboard
print_title "Validating HACCP dashboard..."

DASHBOARD_DATA=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/haccp/dashboard")

COMPLIANCE_SCORE=$(echo "$DASHBOARD_DATA" | jq -r '.complianceScore // "null"')
CRITICAL_EVENTS=$(echo "$DASHBOARD_DATA" | jq -r '.criticalEvents // "null"')

if [ "$COMPLIANCE_SCORE" = "null" ] || [ "$CRITICAL_EVENTS" = "null" ]; then
    print_error "HACCP dashboard data invalid"
fi

print_success "HACCP dashboard: Compliance Score: $COMPLIANCE_SCORE%, Critical Events: $CRITICAL_EVENTS"

# 7. Test order creation with employee tracking
print_title "Testing order creation with employee tracking..."

ORDER_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"table_id\":\"$TABLE_ID\",
    \"assigned_employee_id\":\"$EMPLOYEE_ID\",
    \"items\":[{
      \"product_id\":\"$PRODUCT_ID\",
      \"quantity\":1
    }]
  }" \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/orders" | \
  jq -r '.id // "null"')

if [ "$ORDER_ID" = "null" ]; then
    print_error "Order creation with employee tracking failed"
fi

print_success "Order created with employee tracking: $ORDER_ID"

# 8. Test timesheet generation
print_title "Testing timesheet generation..."

TIMESHEET_DATA=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/employees/$EMPLOYEE_ID/timesheet?date=$(date +%Y-%m-%d)")

TOTAL_HOURS=$(echo "$TIMESHEET_DATA" | jq -r '.totalHours // "null"')

if [ "$TOTAL_HOURS" = "null" ]; then
    print_error "Timesheet generation failed"
fi

print_success "Timesheet generated: Total Hours: $TOTAL_HOURS"

# 9. Test notification system
print_title "Testing notification system..."

NOTIFICATION_TEST=$(curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"test",
    "subject":"Deployment Test Notification",
    "content":"This is a test notification to verify email delivery.",
    "recipients":["test@beerflow.com"]
  }' \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/notifications/send" | \
  jq -r '.id // "null"')

if [ "$NOTIFICATION_TEST" = "null" ]; then
    print_error "Notification test failed"
fi

print_success "Test notification sent: $NOTIFICATION_TEST"

# 10. Validate metrics endpoint
print_title "Validating Prometheus metrics..."

METRICS_DATA=$(curl -s http://localhost:3000/metrics)

if [[ ! "$METRICS_DATA" =~ "beerflow_employee_clock_operations_total" ]]; then
    print_error "Employee metrics not found in Prometheus endpoint"
fi

if [[ ! "$METRICS_DATA" =~ "beerflow_haccp_temperature_checks_total" ]]; then
    print_error "HACCP metrics not found in Prometheus endpoint"
fi

print_success "Prometheus metrics validated"

# 11. Test scheduled tasks status
print_title "Validating scheduled tasks..."

SCHEDULED_TASKS_STATUS=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
  "http://localhost:3000/api/v1/admin/scheduled-tasks/status" | \
  jq -r '.status // "error"')

if [ "$SCHEDULED_TASKS_STATUS" != "active" ]; then
    print_error "Scheduled tasks not active"
fi

print_success "Scheduled tasks validated"

# Final validation summary
print_title "🎉 COMPLETE SYSTEM VALIDATION SUMMARY"

echo "
✅ Employee Management System: OPERATIONAL
✅ Time Clock System: OPERATIONAL  
✅ HACCP Compliance System: OPERATIONAL
✅ Critical Temperature Alerts: FUNCTIONAL
✅ Notification System: OPERATIONAL
✅ Order Management Integration: OPERATIONAL
✅ Metrics Collection: OPERATIONAL
✅ Scheduled Tasks: OPERATIONAL
✅ Health Monitoring: OPERATIONAL

🍺 BeerFlow Complete Restaurant Management System: PRODUCTION READY
"

print_success "All systems validated successfully!"
```

PRODUCTION READINESS CHECKLIST COMPLETO:
```markdown
# BeerFlow Phase 4 Complete Production Readiness

## Core System Integration ✅
- [ ] Phase 1 (Auth/Core): Fully integrated and operational
- [ ] Phase 2 (Products/Stock): FEFO allocation working with employee tracking
- [ ] Phase 3 (Orders/Tables): Employee assignment and tracking functional  
- [ ] Phase 4 (Employee/HACCP): Complete implementation operational
- [ ] Cross-phase data integrity maintained
- [ ] Multi-venue isolation enforced across all phases

## Employee Management System ✅
- [ ] Employee CRUD operations functional
- [ ] Time clock system with sequence validation
- [ ] Shift management and scheduling
- [ ] Overtime calculation and alerts
- [ ] Certification tracking and expiry alerts
- [ ] Performance metrics collection
- [ ] Payroll data generation ready

## HACCP Compliance System ✅
- [ ] Temperature area management functional
- [ ] Temperature logging with status detection
- [ ] Critical temperature alerts < 1 minute delivery
- [ ] Manager review workflow operational
- [ ] Compliance dashboard and scoring
- [ ] Overdue check monitoring
- [ ] QR code mobile access functional

## Notification Infrastructure ✅
- [ ] Email system production-ready
- [ ] Critical alert delivery guaranteed
- [ ] Retry mechanisms functional
- [ ] Escalation procedures tested
- [ ] Notification queue processing
- [ ] Delivery confirmation tracking

## Scheduled Tasks & Automation ✅
- [ ] Certification expiry checks automated
- [ ] HACCP compliance monitoring automated
- [ ] Overtime alerts automated
- [ ] Distributed task execution (clustering)
- [ ] Task failure recovery mechanisms
- [ ] Comprehensive task logging

## Performance & Monitoring ✅
- [ ] Employee operations < 200ms average
- [ ] HACCP operations < 100ms average
- [ ] Notification delivery < 500ms
- [ ] Health checks for all subsystems
- [ ] Prometheus metrics collection
- [ ] Grafana dashboards operational
- [ ] Alert rules configured

## Security & Compliance ✅
- [ ] Employee data privacy (GDPR compliant)
- [ ] HACCP audit trail immutable
- [ ] Role-based access control enforced
- [ ] Venue isolation maintained
- [ ] Critical data encryption
- [ ] Security audit completed

## Production Infrastructure ✅
- [ ] Email SMTP configuration production-ready
- [ ] Database backup automation
- [ ] Container deployment tested
- [ ] Load balancing configured
- [ ] SSL/TLS certificates configured
- [ ] Environment variable security

## Business Process Integration ✅
- [ ] Complete restaurant workflow operational
- [ ] Employee performance tracking across orders
- [ ] HACCP compliance during service operations
- [ ] Automated compliance reporting
- [ ] Manager oversight tools functional
- [ ] Staff mobile access optimized

## Disaster Recovery & Business Continuity ✅
- [ ] Automated daily backups
- [ ] Point-in-time recovery tested
- [ ] Rollback procedures validated
- [ ] Failover mechanisms tested
- [ ] Critical alert backup delivery
- [ ] Emergency contact procedures

## Final Sign-off ✅
- [ ] All automated tests passing (100%)
- [ ] Performance benchmarks met
- [ ] Security audit approved
- [ ] User acceptance testing completed
- [ ] Documentation complete
- [ ] Training materials delivered
- [ ] Production deployment successful
- [ ] Business stakeholder approval
```

FINAL VALIDATION COMMANDS:
```bash
# Complete system test
./scripts/validate-complete-system.sh

# Performance validation
npm run test:performance:all

# Security scan
npm run security:scan

# Production deployment test
./scripts/deploy-production-test.sh

# Email system test
./scripts/test-email-production.sh

# Monitoring validation
./scripts/validate-monitoring.sh
```

CRITERI COMPLETAMENTO FINALI:
- Sistema deve essere COMPLETAMENTE pronto per produzione
- Monitoring operativo con tutte le metriche business
- Email infrastructure production-ready con delivery garantito
- HACCP compliance system audit-ready
- Employee management system payroll-ready
- Performance ottimizzate sotto tutti i threshold
- Business logic validata end-to-end
- Security e compliance certificate
- Deployment zero-downtime configurato
- Complete restaurant operations workflow funzionante

Esegui TUTTI gli step di integration e validation. Il sistema deve essere production-ready al 100% con complete restaurant management capabilities, monitoring completo, HACCP compliance audit-ready e business operations ottimizzate.
```

---

## CONCLUSIONI FASE 4

Questi prompt guidano Jules attraverso l'implementazione completa del sistema Employee Portal & HACCP Compliance con particolare attenzione a:

1. **Employee Management Completo**: Time clock, shift management, certification tracking
2. **HACCP Compliance System**: Temperature monitoring, critical alerts, compliance automation
3. **Notification Infrastructure**: Email delivery garantito, retry mechanisms, escalation
4. **Scheduled Tasks**: Automation compliance, clustering, fault tolerance
5. **Complete Integration**: Restaurant operations end-to-end con tutte le fasi
6. **Production Readiness**: Monitoring, security, performance, business continuity

Il sistema risultante sarà completamente operativo per gestire tutte le operazioni di una birreria con compliance HACCP automatizzata, gestione dipendenti completa e monitoring avanzato business-ready.
