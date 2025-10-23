FASE_3_IMPLEMENTATION

# FASE 3 - IMPLEMENTAZIONE ORDER MANAGEMENT & POS SYSTEM

## Obiettivo Fase
Implementare il sistema completo di gestione ordini, tavoli, prenotazioni e POS con integrazione real-time WebSocket per Kitchen Display System (KDS) e scarico automatico magazzino tramite FEFO.

## Prerequisiti Verificati
- Fase 1: Core Backend con autenticazione funzionante
- Fase 2: Product & Inventory Management operativo
- Business logic FEFO validata e performance verificate
- Database con schema completo e dati demo

## Architettura Moduli Fase 3
- **Tables**: Gestione tavoli con posizionamento e stati
- **Reservations**: Sistema prenotazioni multi-canale
- **Orders**: Core order management con stati workflow
- **OrderItems**: Dettaglio righe ordine con tracking
- **WebSocket Gateway**: Real-time communication per KDS
- **POS Service**: Business logic per splitting e pagamenti

---

## 1. Nuove Dipendenze Richieste

### 1.1 Installazione Dipendenze WebSocket e Real-time
```bash
cd backend

# WebSocket e Real-time communication
npm install --save @nestjs/websockets @nestjs/platform-socket.io
npm install --save socket.io

# Date/Time utilities avanzate
npm install --save @nestjs/schedule
npm install --save cron

# PDF generation per ricevute
npm install --save puppeteer
npm install --save @types/puppeteer

# Validation avanzata per business logic
npm install --save class-validator-multi-lang

# Dev dependencies
npm install --save-dev @types/socket.io
npm install --save-dev @types/cron
```

---

## 2. Entità Database Orders & Tables

### 2.1 Table Entity (src/database/entities/table.entity.ts)
```typescript
import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { Order } from './order.entity';
import { Reservation } from './reservation.entity';
import { TableStatus } from '../enums/table-status.enum';

@Entity('tables')
export class Table extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'integer', default: 2 })
  seats: number;

  @Column({ type: 'jsonb', default: '{"x": 0, "y": 0}' })
  position_json: { x: number; y: number; width?: number; height?: number };

  @Column({ 
    type: 'enum', 
    enum: TableStatus, 
    default: TableStatus.FREE 
  })
  status: TableStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  area: string; // 'main_hall', 'terrace', 'private_room'

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @OneToMany(() => Order, order => order.table)
  orders: Order[];

  @OneToMany(() => Reservation, reservation => reservation.table)
  reservations: Reservation[];

  // Virtual fields
  currentOrder?: Order;
  nextReservation?: Reservation;
}
```

### 2.2 Reservation Entity (src/database/entities/reservation.entity.ts)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { Table } from './table.entity';
import { ReservationStatus } from '../enums/reservation-status.enum';

@Entity('reservations')
export class Reservation extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid', nullable: true })
  table_id: string;

  @Column({ type: 'varchar', length: 255 })
  customer_name: string;

  @Column({ type: 'varchar', length: 50 })
  customer_phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_email: string;

  @Column({ type: 'timestamptz' })
  start_time: Date;

  @Column({ type: 'timestamptz' })
  end_time: Date;

  @Column({ type: 'integer' })
  people_count: number;

  @Column({ 
    type: 'enum', 
    enum: ReservationStatus, 
    default: ReservationStatus.PENDING 
  })
  status: ReservationStatus;

  @Column({ type: 'varchar', length: 100, default: 'manual' })
  source: string; // 'manual', 'website', 'phone', 'thefork'

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  special_requests: string;

  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Table)
  @JoinColumn({ name: 'table_id' })
  table: Table;
}
```

### 2.3 Order Entity (src/database/entities/order.entity.ts)
```typescript
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { Table } from './table.entity';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Entity('orders')
export class Order extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid', nullable: true })
  table_id: string;

  @Column({ type: 'uuid' })
  user_id: string; // Waiter who created the order

  @Column({ type: 'varchar', length: 50 })
  order_number: string; // Auto-generated: ORD-20241201-001

  @Column({ 
    type: 'enum', 
    enum: OrderStatus, 
    default: OrderStatus.DRAFT 
  })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  service_charge: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  total: number;

  @Column({ type: 'integer', default: 1 })
  covers: number; // Number of people

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  kitchen_started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  ready_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  served_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Table, table => table.orders)
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => OrderItem, item => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => Payment, payment => payment.order)
  payments: Payment[];

  // Virtual fields
  preparationTime?: number; // Minutes from confirmed to ready
  isPaid?: boolean;
  remainingAmount?: number;
}
```

### 2.4 OrderItem Entity (src/database/entities/order-item.entity.ts)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';
import { Product } from './product.entity';
import { Lot } from './lot.entity';
import { OrderItemStatus } from '../enums/order-item-status.enum';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid', nullable: true })
  allocated_lot_id: string; // Set during FEFO allocation

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  total_price: number;

  @Column({ 
    type: 'enum', 
    enum: OrderItemStatus, 
    default: OrderItemStatus.PENDING 
  })
  status: OrderItemStatus;

  @Column({ type: 'text', nullable: true })
  notes: string; // Customer notes (e.g., "No onions")

  @Column({ type: 'text', nullable: true })
  kitchen_notes: string; // Kitchen preparation notes

  @Column({ type: 'integer', default: 0 })
  preparation_time_estimate: number; // Minutes

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'jsonb', default: '{}' })
  modifiers: Record<string, any>; // Product customizations

  // Relations
  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Lot)
  @JoinColumn({ name: 'allocated_lot_id' })
  allocatedLot: Lot;
}
```

### 2.5 Payment Entity (src/database/entities/payment.entity.ts)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { Order } from './order.entity';
import { User } from './user.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
export class Payment extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  processed_by_user_id: string;

  @Column({ type: 'varchar', length: 50 })
  payment_number: string; // Auto-generated: PAY-20241201-001

  @Column({ 
    type: 'enum', 
    enum: PaymentMethod 
  })
  method: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  amount: number;

  @Column({ 
    type: 'enum', 
    enum: PaymentStatus, 
    default: PaymentStatus.PENDING 
  })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transaction_id: string; // External payment processor ID

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamptz', nullable: true })
  processed_at: Date;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>; // Payment processor specific data

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Order, order => order.payments)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'processed_by_user_id' })
  processedByUser: User;
}
```

### 2.6 Status Enums (src/database/enums/)
```typescript
// table-status.enum.ts
export enum TableStatus {
  FREE = 'free',
  OCCUPIED = 'occupied',
  BOOKED = 'booked',
  CLEANING = 'cleaning',
  OUT_OF_SERVICE = 'out_of_service'
}

// reservation-status.enum.ts
export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SEATED = 'seated',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

// order-status.enum.ts
export enum OrderStatus {
  DRAFT = 'draft',           // Being created
  CONFIRMED = 'confirmed',   // Sent to kitchen
  PREPARING = 'preparing',   // Kitchen working
  READY = 'ready',          // Ready for service
  SERVED = 'served',        // Delivered to table
  COMPLETED = 'completed',   // Paid and closed
  CANCELLED = 'cancelled'    // Cancelled order
}

// order-item-status.enum.ts
export enum OrderItemStatus {
  PENDING = 'pending',       // Not started
  PREPARING = 'preparing',   // Being made
  READY = 'ready',          // Ready to serve
  SERVED = 'served',        // Delivered
  CANCELLED = 'cancelled'    // Cancelled item
}

// payment-method.enum.ts
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  CONTACTLESS = 'contactless',
  MOBILE = 'mobile',
  VOUCHER = 'voucher',
  SPLIT = 'split'
}

// payment-status.enum.ts
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}
```

---

## 3. Business Logic Services

### 3.1 Tables Service (src/tables/tables.service.ts)
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Table } from '../database/entities/table.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { Order } from '../database/entities/order.entity';
import { TableStatus } from '../database/enums/table-status.enum';
import { OrderStatus } from '../database/enums/order-status.enum';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { ReorderTablesDto } from './dto/reorder-tables.dto';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async create(venueId: string, createDto: CreateTableDto): Promise<Table> {
    // Check for duplicate name in the same venue and area
    const existing = await this.tableRepository.findOne({
      where: { 
        venue_id: venueId, 
        name: createDto.name, 
        area: createDto.area || null,
        active: true 
      },
    });

    if (existing) {
      throw new ConflictException(`Table '${createDto.name}' already exists in this area`);
    }

    const table = this.tableRepository.create({
      ...createDto,
      venue_id: venueId,
    });

    return await this.tableRepository.save(table);
  }

  async findAll(venueId: string): Promise<Table[]> {
    const tables = await this.tableRepository.find({
      where: { venue_id: venueId, active: true },
      order: { area: 'ASC', name: 'ASC' },
    });

    // Enrich with current status information
    return await this.enrichTablesWithStatus(tables);
  }

  async findOne(venueId: string, id: string): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { id, venue_id: venueId, active: true },
      relations: ['orders', 'reservations'],
    });

    if (!table) {
      throw new NotFoundException(`Table with ID ${id} not found`);
    }

    return await this.enrichTableWithStatus(table);
  }

  async update(venueId: string, id: string, updateDto: UpdateTableDto): Promise<Table> {
    const table = await this.findOne(venueId, id);

    // Check for duplicate name if name is being changed
    if (updateDto.name && updateDto.name !== table.name) {
      const existing = await this.tableRepository.findOne({
        where: { 
          venue_id: venueId, 
          name: updateDto.name,
          area: updateDto.area || table.area,
          active: true 
        },
      });

      if (existing) {
        throw new ConflictException(`Table '${updateDto.name}' already exists in this area`);
      }
    }

    Object.assign(table, updateDto);
    return await this.tableRepository.save(table);
  }

  async remove(venueId: string, id: string): Promise<void> {
    const table = await this.findOne(venueId, id);
    
    // Check if table has active orders
    const activeOrder = await this.orderRepository.findOne({
      where: { 
        table_id: id, 
        status: OrderStatus.CONFIRMED || OrderStatus.PREPARING || OrderStatus.READY 
      },
    });

    if (activeOrder) {
      throw new ConflictException('Cannot delete table with active orders');
    }

    table.active = false;
    await this.tableRepository.save(table);
  }

  async updateTablePositions(venueId: string, reorderDto: ReorderTablesDto): Promise<void> {
    const tables = await this.tableRepository.find({
      where: { venue_id: venueId, active: true },
    });

    for (const update of reorderDto.tables) {
      const table = tables.find(t => t.id === update.id);
      if (table) {
        table.position_json = update.position;
        await this.tableRepository.save(table);
      }
    }
  }

  async updateTableStatus(
    venueId: string, 
    tableId: string, 
    status: TableStatus
  ): Promise<Table> {
    const table = await this.findOne(venueId, tableId);
    table.status = status;
    return await this.tableRepository.save(table);
  }

  async getAvailableTables(
    venueId: string, 
    startTime: Date, 
    endTime: Date, 
    peopleCount: number
  ): Promise<Table[]> {
    // Get all tables that can accommodate the party size
    const suitableTables = await this.tableRepository
      .createQueryBuilder('table')
      .where('table.venue_id = :venueId', { venueId })
      .andWhere('table.seats >= :peopleCount', { peopleCount })
      .andWhere('table.active = :active', { active: true })
      .andWhere('table.status != :outOfService', { outOfService: TableStatus.OUT_OF_SERVICE })
      .getMany();

    // Filter out tables with conflicting reservations
    const availableTables = [];
    
    for (const table of suitableTables) {
      const conflictingReservation = await this.reservationRepository
        .createQueryBuilder('reservation')
        .where('reservation.table_id = :tableId', { tableId: table.id })
        .andWhere('reservation.status IN (:...statuses)', { 
          statuses: ['confirmed', 'seated'] 
        })
        .andWhere(
          '(reservation.start_time < :endTime AND reservation.end_time > :startTime)',
          { startTime, endTime }
        )
        .getOne();

      if (!conflictingReservation) {
        availableTables.push(table);
      }
    }

    return availableTables;
  }

  private async enrichTablesWithStatus(tables: Table[]): Promise<Table[]> {
    for (const table of tables) {
      await this.enrichTableWithStatus(table);
    }
    return tables;
  }

  private async enrichTableWithStatus(table: Table): Promise<Table> {
    // Get current active order
    const currentOrder = await this.orderRepository.findOne({
      where: { 
        table_id: table.id, 
        status: In([
          OrderStatus.DRAFT,
          OrderStatus.CONFIRMED,
          OrderStatus.PREPARING,
          OrderStatus.READY,
          OrderStatus.SERVED
        ])
      },
      order: { created_at: 'DESC' },
    });

    if (currentOrder) {
      table.currentOrder = currentOrder;
      
      // Update table status based on order status
      if (currentOrder.status === OrderStatus.DRAFT) {
        table.status = TableStatus.OCCUPIED;
      } else if ([OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY].includes(currentOrder.status)) {
        table.status = TableStatus.OCCUPIED;
      }
    }

    // Get next reservation
    const nextReservation = await this.reservationRepository.findOne({
      where: { 
        table_id: table.id,
        start_time: MoreThan(new Date()),
        status: 'confirmed'
      },
      order: { start_time: 'ASC' },
    });

    if (nextReservation) {
      table.nextReservation = nextReservation;
      
      // Check if reservation is soon (within 30 minutes)
      const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);
      if (nextReservation.start_time <= thirtyMinutesFromNow && !currentOrder) {
        table.status = TableStatus.BOOKED;
      }
    }

    return table;
  }
}
```

### 3.2 Orders Service con FEFO Integration (src/orders/orders.service.ts)
```typescript
import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Order } from '../database/entities/order.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import { Product } from '../database/entities/product.entity';
import { Table } from '../database/entities/table.entity';
import { OrderStatus } from '../database/enums/order-status.enum';
import { OrderItemStatus } from '../database/enums/order-item-status.enum';
import { TableStatus } from '../database/enums/table-status.enum';
import { StockService } from '../stock/stock.service';
import { OrdersGateway } from './orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AddOrderItemsDto } from './dto/add-order-items.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    private readonly stockService: StockService,
    private readonly ordersGateway: OrdersGateway,
    private readonly dataSource: DataSource,
  ) {}

  async create(venueId: string, createDto: CreateOrderDto, userId: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify table exists and is available
      if (createDto.table_id) {
        const table = await queryRunner.manager.findOne(Table, {
          where: { id: createDto.table_id, venue_id: venueId, active: true },
        });

        if (!table) {
          throw new NotFoundException('Table not found');
        }

        // Check for existing active order on this table
        const existingOrder = await queryRunner.manager.findOne(Order, {
          where: { 
            table_id: createDto.table_id, 
            status: In([OrderStatus.DRAFT, OrderStatus.CONFIRMED, OrderStatus.PREPARING])
          },
        });

        if (existingOrder) {
          throw new ConflictException('Table already has an active order');
        }
      }

      // Generate order number
      const orderNumber = await this.generateOrderNumber(venueId);

      // Create order
      const order = queryRunner.manager.create(Order, {
        ...createDto,
        venue_id: venueId,
        user_id: userId,
        order_number: orderNumber,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Create order items if provided
      if (createDto.items && createDto.items.length > 0) {
        await this.createOrderItems(queryRunner, savedOrder.id, createDto.items);
      }

      // Update table status if applicable
      if (createDto.table_id) {
        await queryRunner.manager.update(Table, createDto.table_id, {
          status: TableStatus.OCCUPIED,
        });
      }

      await queryRunner.commitTransaction();

      // Load complete order with relations
      const completeOrder = await this.findOne(venueId, savedOrder.id);

      // Emit real-time event
      this.ordersGateway.emitOrderCreated(completeOrder);

      return completeOrder;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(venueId: string, filters?: {
    status?: OrderStatus;
    table_id?: string;
    user_id?: string;
    date_from?: Date;
    date_to?: Date;
  }): Promise<Order[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.table', 'table')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('order.venue_id = :venueId', { venueId });

    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters?.table_id) {
      query.andWhere('order.table_id = :tableId', { tableId: filters.table_id });
    }

    if (filters?.user_id) {
      query.andWhere('order.user_id = :userId', { userId: filters.user_id });
    }

    if (filters?.date_from) {
      query.andWhere('order.created_at >= :dateFrom', { dateFrom: filters.date_from });
    }

    if (filters?.date_to) {
      query.andWhere('order.created_at <= :dateTo', { dateTo: filters.date_to });
    }

    query.orderBy('order.created_at', 'DESC');

    return await query.getMany();
  }

  async findOne(venueId: string, id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, venue_id: venueId },
      relations: [
        'table', 
        'user', 
        'items', 
        'items.product', 
        'items.allocatedLot',
        'payments'
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Calculate virtual fields
    order.isPaid = this.calculateIsPaid(order);
    order.remainingAmount = this.calculateRemainingAmount(order);
    order.preparationTime = this.calculatePreparationTime(order);

    return order;
  }

  async updateStatus(
    venueId: string, 
    id: string, 
    status: OrderStatus, 
    userId: string
  ): Promise<Order> {
    const order = await this.findOne(venueId, id);

    // Validate status transition
    this.validateStatusTransition(order.status, status);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update timestamps based on status
      const updateData: Partial<Order> = { status };
      
      switch (status) {
        case OrderStatus.CONFIRMED:
          updateData.confirmed_at = new Date();
          break;
        case OrderStatus.PREPARING:
          updateData.kitchen_started_at = new Date();
          break;
        case OrderStatus.READY:
          updateData.ready_at = new Date();
          break;
        case OrderStatus.SERVED:
          updateData.served_at = new Date();
          // Execute FEFO allocation and stock movements
          await this.executeStockMovements(queryRunner, order, userId);
          break;
        case OrderStatus.COMPLETED:
          updateData.completed_at = new Date();
          // Free up table
          if (order.table_id) {
            await queryRunner.manager.update(Table, order.table_id, {
              status: TableStatus.CLEANING,
            });
          }
          break;
      }

      await queryRunner.manager.update(Order, id, updateData);
      
      await queryRunner.commitTransaction();

      // Get updated order
      const updatedOrder = await this.findOne(venueId, id);

      // Emit real-time event
      this.ordersGateway.emitOrderStatusUpdate(updatedOrder);

      return updatedOrder;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async addItems(
    venueId: string, 
    orderId: string, 
    addItemsDto: AddOrderItemsDto
  ): Promise<Order> {
    const order = await this.findOne(venueId, orderId);

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Can only add items to draft orders');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.createOrderItems(queryRunner, orderId, addItemsDto.items);
      
      // Recalculate order totals
      await this.recalculateOrderTotals(queryRunner, orderId);

      await queryRunner.commitTransaction();

      return await this.findOne(venueId, orderId);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getKitchenDisplayOrders(venueId: string): Promise<Order[]> {
    return await this.findAll(venueId, {
      status: In([OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY])
    });
  }

  private async generateOrderNumber(venueId: string): Promise<string> {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    const count = await this.orderRepository.count({
      where: {
        venue_id: venueId,
        created_at: MoreThanOrEqual(new Date(new Date().setHours(0, 0, 0, 0)))
      }
    });

    return `ORD-${today}-${String(count + 1).padStart(3, '0')}`;
  }

  private async createOrderItems(
    queryRunner: any, 
    orderId: string, 
    items: Array<{
      product_id: string;
      quantity: number;
      notes?: string;
      modifiers?: Record<string, any>;
    }>
  ): Promise<void> {
    for (const itemData of items) {
      // Get product details
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: itemData.product_id, active: true },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${itemData.product_id} not found`);
      }

      // Create order item
      const orderItem = queryRunner.manager.create(OrderItem, {
        order_id: orderId,
        product_id: itemData.product_id,
        quantity: itemData.quantity,
        unit_price: product.price,
        total_price: product.price * itemData.quantity,
        notes: itemData.notes,
        modifiers: itemData.modifiers || {},
        status: OrderItemStatus.PENDING,
      });

      await queryRunner.manager.save(orderItem);
    }
  }

  private async executeStockMovements(
    queryRunner: any,
    order: Order,
    userId: string
  ): Promise<void> {
    for (const item of order.items) {
      if (item.product.unit && item.quantity > 0) {
        try {
          // Execute FEFO allocation for this item
          const movements = await this.stockService.executeFefoAllocation(
            order.venue_id,
            item.product_id,
            item.quantity,
            'order',
            order.id,
            userId,
            `Order ${order.order_number} - ${item.product.name}`
          );

          // Update order item with allocated lot (first one if multiple)
          if (movements.length > 0) {
            await queryRunner.manager.update(OrderItem, item.id, {
              allocated_lot_id: movements[0].lot_id,
              status: OrderItemStatus.SERVED,
            });
          }

        } catch (error) {
          // Log error but don't fail the entire order
          console.error(`Failed to allocate stock for item ${item.id}: ${error.message}`);
        }
      }
    }
  }

  private async recalculateOrderTotals(queryRunner: any, orderId: string): Promise<void> {
    const items = await queryRunner.manager.find(OrderItem, {
      where: { order_id: orderId },
    });

    const subtotal = items.reduce((sum, item) => sum + Number(item.total_price), 0);
    const taxRate = 0.22; // 22% VAT - should come from venue settings
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    await queryRunner.manager.update(Order, orderId, {
      subtotal,
      tax_amount: taxAmount,
      total,
    });
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions = {
      [OrderStatus.DRAFT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.SERVED],
      [OrderStatus.SERVED]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private calculateIsPaid(order: Order): boolean {
    if (!order.payments || order.payments.length === 0) return false;
    
    const totalPaid = order.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    
    return totalPaid >= Number(order.total);
  }

  private calculateRemainingAmount(order: Order): number {
    if (!order.payments || order.payments.length === 0) return Number(order.total);
    
    const totalPaid = order.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    
    return Math.max(0, Number(order.total) - totalPaid);
  }

  private calculatePreparationTime(order: Order): number | null {
    if (!order.confirmed_at || !order.ready_at) return null;
    
    return Math.round((order.ready_at.getTime() - order.confirmed_at.getTime()) / (1000 * 60));
  }
}
```

### 3.3 WebSocket Gateway per Real-time (src/orders/orders.gateway.ts)
```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Order } from '../database/entities/order.entity';
import { Table } from '../database/entities/table.entity';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    venue_id: string;
    role: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/orders',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);
  private venueRooms = new Map<string, Set<string>>(); // venue_id -> Set<socket_id>

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove from venue rooms
    for (const [venueId, socketIds] of this.venueRooms.entries()) {
      socketIds.delete(client.id);
      if (socketIds.size === 0) {
        this.venueRooms.delete(venueId);
      }
    }
  }

  @SubscribeMessage('join_venue')
  handleJoinVenue(
    @MessageBody() data: { venue_id: string; user_id: string; role: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // Store user info in socket
    client.user = {
      id: data.user_id,
      venue_id: data.venue_id,
      role: data.role,
    };

    // Join venue room
    const venueRoom = `venue_${data.venue_id}`;
    client.join(venueRoom);

    // Track in venue rooms map
    if (!this.venueRooms.has(data.venue_id)) {
      this.venueRooms.set(data.venue_id, new Set());
    }
    this.venueRooms.get(data.venue_id).add(client.id);

    this.logger.log(`Client ${client.id} joined venue ${data.venue_id}`);

    // Send confirmation
    client.emit('joined_venue', { venue_id: data.venue_id });
  }

  @SubscribeMessage('leave_venue')
  handleLeaveVenue(
    @MessageBody() data: { venue_id: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const venueRoom = `venue_${data.venue_id}`;
    client.leave(venueRoom);

    // Remove from tracking
    const venueClients = this.venueRooms.get(data.venue_id);
    if (venueClients) {
      venueClients.delete(client.id);
      if (venueClients.size === 0) {
        this.venueRooms.delete(data.venue_id);
      }
    }

    this.logger.log(`Client ${client.id} left venue ${data.venue_id}`);
  }

  @SubscribeMessage('order_status_update')
  handleOrderStatusUpdate(
    @MessageBody() data: { order_id: string; status: string; updated_by: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) return;

    // Broadcast to all clients in the same venue
    const venueRoom = `venue_${client.user.venue_id}`;
    
    this.server.to(venueRoom).emit('order_status_changed', {
      order_id: data.order_id,
      status: data.status,
      updated_by: data.updated_by,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Order ${data.order_id} status updated to ${data.status} by ${data.updated_by}`);
  }

  @SubscribeMessage('kitchen_notification')
  handleKitchenNotification(
    @MessageBody() data: { message: string; priority: 'low' | 'medium' | 'high' },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) return;

    const venueRoom = `venue_${client.user.venue_id}`;
    
    this.server.to(venueRoom).emit('kitchen_alert', {
      message: data.message,
      priority: data.priority,
      from_user: client.user.id,
      timestamp: new Date().toISOString(),
    });
  }

  // Server-side event emitters (called from services)
  emitOrderCreated(order: Order) {
    const venueRoom = `venue_${order.venue_id}`;
    
    this.server.to(venueRoom).emit('new_order', {
      order_id: order.id,
      order_number: order.order_number,
      table_name: order.table?.name,
      item_count: order.items?.length || 0,
      total: order.total,
      created_by: order.user?.name,
      timestamp: order.created_at.toISOString(),
    });

    this.logger.log(`New order ${order.order_number} broadcast to venue ${order.venue_id}`);
  }

  emitOrderStatusUpdate(order: Order) {
    const venueRoom = `venue_${order.venue_id}`;
    
    this.server.to(venueRoom).emit('order_status_changed', {
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      table_name: order.table?.name,
      timestamp: new Date().toISOString(),
    });
  }

  emitTableStatusUpdate(table: Table) {
    const venueRoom = `venue_${table.venue_id}`;
    
    this.server.to(venueRoom).emit('table_status_changed', {
      table_id: table.id,
      table_name: table.name,
      status: table.status,
      timestamp: new Date().toISOString(),
    });
  }

  emitKitchenAlert(venueId: string, message: string, priority: 'low' | 'medium' | 'high') {
    const venueRoom = `venue_${venueId}`;
    
    this.server.to(venueRoom).emit('kitchen_alert', {
      message,
      priority,
      timestamp: new Date().toISOString(),
    });
  }

  // Get connected clients count for a venue
  getVenueConnectionCount(venueId: string): number {
    return this.venueRooms.get(venueId)?.size || 0;
  }

  // Get all connected venues
  getConnectedVenues(): string[] {
    return Array.from(this.venueRooms.keys());
  }
}
```

---

## 4. Controllers con Validazione Completa

### 4.1 Orders Controller (src/orders/orders.controller.ts)
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AddOrderItemsDto } from './dto/add-order-items.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { VenueGuard } from '../common/guards/venue.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VenueAccess } from '../common/decorators/venue-access.decorator';
import { UserRole } from '../database/enums/user-role.enum';
import { OrderStatus } from '../database/enums/order-status.enum';
import { User } from '../database/entities/user.entity';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, VenueGuard)
@Controller('venues/:venueId/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER)
  @VenueAccess()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 409, description: 'Table already has active order' })
  create(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.create(venueId, createOrderDto, user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER, UserRole.KITCHEN)
  @VenueAccess()
  @ApiOperation({ summary: 'Get all orders with filtering' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'table_id', required: false, type: String })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'date_from', required: false, type: Date })
  @ApiQuery({ name: 'date_to', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  findAll(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query() query: OrdersQueryDto,
  ) {
    return this.ordersService.findAll(venueId, query);
  }

  @Get('kitchen-display')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.KITCHEN, UserRole.WAITER)
  @VenueAccess()
  @ApiOperation({ summary: 'Get orders for kitchen display system' })
  @ApiResponse({ status: 200, description: 'Kitchen display orders retrieved' })
  getKitchenDisplayOrders(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return this.ordersService.getKitchenDisplayOrders(venueId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER, UserRole.KITCHEN)
  @VenueAccess()
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findOne(venueId, id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER, UserRole.KITCHEN)
  @VenueAccess()
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  updateStatus(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: { status: OrderStatus },
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateStatus(venueId, id, updateDto.status, user.id);
  }

  @Post(':id/items')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER)
  @VenueAccess()
  @ApiOperation({ summary: 'Add items to existing order' })
  @ApiResponse({ status: 200, description: 'Items added successfully' })
  @ApiResponse({ status: 400, description: 'Cannot add items to non-draft order' })
  addItems(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addItemsDto: AddOrderItemsDto,
  ) {
    return this.ordersService.addItems(venueId, id, addItemsDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER)
  @VenueAccess()
  @ApiOperation({ summary: 'Update order details' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  update(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    // Implement if needed - usually orders are not directly updated
    throw new Error('Direct order updates not implemented - use specific endpoints');
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  cancel(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateStatus(venueId, id, OrderStatus.CANCELLED, user.id);
  }
}
```

### 4.2 Tables Controller (src/tables/tables.controller.ts)
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { ReorderTablesDto } from './dto/reorder-tables.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { VenueGuard } from '../common/guards/venue.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { VenueAccess } from '../common/decorators/venue-access.decorator';
import { UserRole } from '../database/enums/user-role.enum';
import { TableStatus } from '../database/enums/table-status.enum';

@ApiTags('tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, VenueGuard)
@Controller('venues/:venueId/tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Create a new table' })
  @ApiResponse({ status: 201, description: 'Table created successfully' })
  @ApiResponse({ status: 409, description: 'Table name already exists in area' })
  create(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() createTableDto: CreateTableDto,
  ) {
    return this.tablesService.create(venueId, createTableDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER)
  @VenueAccess()
  @ApiOperation({ summary: 'Get all tables for venue' })
  @ApiResponse({ status: 200, description: 'Tables retrieved successfully' })
  findAll(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return this.tablesService.findAll(venueId);
  }

  @Get('availability')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER)
  @VenueAccess()
  @ApiOperation({ summary: 'Check table availability for reservation' })
  @ApiQuery({ name: 'start_time', required: true, type: Date })
  @ApiQuery({ name: 'end_time', required: true, type: Date })
  @ApiQuery({ name: 'people_count', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Available tables retrieved' })
  checkAvailability(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.tablesService.getAvailableTables(
      venueId,
      query.start_time,
      query.end_time,
      query.people_count,
    );
  }

  @Patch('layout')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Update table positions (drag & drop layout)' })
  @ApiResponse({ status: 200, description: 'Table layout updated successfully' })
  updateLayout(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() reorderDto: ReorderTablesDto,
  ) {
    return this.tablesService.updateTablePositions(venueId, reorderDto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER)
  @VenueAccess()
  @ApiOperation({ summary: 'Get table by ID' })
  @ApiResponse({ status: 200, description: 'Table retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Table not found' })
  findOne(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tablesService.findOne(venueId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Update table' })
  @ApiResponse({ status: 200, description: 'Table updated successfully' })
  update(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTableDto: UpdateTableDto,
  ) {
    return this.tablesService.update(venueId, id, updateTableDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER)
  @VenueAccess()
  @ApiOperation({ summary: 'Update table status' })
  @ApiResponse({ status: 200, description: 'Table status updated successfully' })
  updateStatus(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: { status: TableStatus },
  ) {
    return this.tablesService.updateTableStatus(venueId, id, statusDto.status);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Delete table (soft delete)' })
  @ApiResponse({ status: 200, description: 'Table deleted successfully' })
  @ApiResponse({ status: 409, description: 'Cannot delete table with active orders' })
  remove(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tablesService.remove(venueId, id);
  }
}
```

---

## 5. DTOs con Validazione Avanzata

### 5.1 Create Order DTO (src/orders/dto/create-order.dto.ts)
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsPositive,
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class CreateOrderItemDto {
  @ApiProperty({ example: '33333333-3333-3333-3333-333333333333' })
  @IsUUID(4)
  @IsNotEmpty()
  product_id: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Quantity must be a number' })
  @IsPositive({ message: 'Quantity must be positive' })
  @Transform(({ value }) => parseFloat(value))
  quantity: number;

  @ApiPropertyOptional({ example: 'No ice, extra lemon' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: { size: 'large', extras: ['extra_cheese'] },
    description: 'Product modifications/customizations'
  })
  @IsOptional()
  modifiers?: Record<string, any>;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ 
    example: '44444444-4444-4444-4444-444444444444',
    description: 'Table ID - optional for takeaway orders'
  })
  @IsOptional()
  @IsUUID(4)
  table_id?: string;

  @ApiPropertyOptional({ 
    example: 4,
    description: 'Number of people/covers'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  covers?: number;

  @ApiPropertyOptional({ 
    example: 'Customer allergic to nuts',
    description: 'Order notes'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: [CreateOrderItemDto],
    description: 'Order items - can be empty for draft orders'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}
```

### 5.2 Orders Query DTO (src/orders/dto/orders-query.dto.ts)
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsOptional, 
  IsUUID, 
  IsEnum, 
  IsDateString,
  IsString
} from 'class-validator';
import { Transform } from 'class-transformer';
import { OrderStatus } from '../../database/enums/order-status.enum';

export class OrdersQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Filter by table ID' })
  @IsOptional()
  @IsUUID(4)
  table_id?: string;

  @ApiPropertyOptional({ description: 'Filter by user/waiter ID' })
  @IsOptional()
  @IsUUID(4)
  user_id?: string;

  @ApiPropertyOptional({ 
    description: 'Filter orders from date (ISO string)',
    example: '2024-12-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  date_from?: Date;

  @ApiPropertyOptional({ 
    description: 'Filter orders to date (ISO string)',
    example: '2024-12-01T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  date_to?: Date;
}
```

### 5.3 Add Order Items DTO (src/orders/dto/add-order-items.dto.ts)
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemToAddDto {
  @ApiProperty()
  @IsUUID(4)
  product_id: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  modifiers?: Record<string, any>;
}

export class AddOrderItemsDto {
  @ApiProperty({ 
    type: [OrderItemToAddDto],
    description: 'Items to add to the order'
  })
  @IsArray()
  @IsNotEmpty({ message: 'Items array cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemToAddDto)
  items: OrderItemToAddDto[];
}
```

### 5.4 Create Table DTO (src/tables/dto/create-table.dto.ts)
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsObject,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTableDto {
  @ApiProperty({ 
    example: 'T01',
    description: 'Table identifier/name'
  })
  @IsString()
  @IsNotEmpty({ message: 'Table name is required' })
  @MaxLength(100, { message: 'Table name cannot exceed 100 characters' })
  @Matches(/^[A-Z0-9\-_]+$/i, { 
    message: 'Table name can only contain letters, numbers, hyphens and underscores' 
  })
  name: string;

  @ApiProperty({ 
    example: 4,
    description: 'Number of seats at the table'
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Seats must be a number' })
  @Min(1, { message: 'Table must have at least 1 seat' })
  @Max(20, { message: 'Table cannot have more than 20 seats' })
  seats: number;

  @ApiPropertyOptional({
    example: { x: 100, y: 150, width: 80, height: 80 },
    description: 'Table position and size on the layout'
  })
  @IsOptional()
  @IsObject()
  position_json?: { 
    x: number; 
    y: number; 
    width?: number; 
    height?: number 
  };

  @ApiPropertyOptional({ 
    example: 'main_hall',
    description: 'Area/section where table is located'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  area?: string;

  @ApiPropertyOptional({ 
    example: 'VIP table with view',
    description: 'Additional notes about the table'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
```

---

## 6. Criteri di Completamento Fase 3

### Verifiche Funzionali Obbligatorie:
1. **CRUD Tables**: Creazione, gestione posizioni, stati funzionanti
2. **Order Management**: Workflow completo draft → confirmed → served → completed
3. **WebSocket Real-time**: Kitchen Display System riceve ordini instantaneamente
4. **FEFO Integration**: Scarico automatico magazzino quando ordine servito
5. **Authorization**: Role-based access per waiters, kitchen, managers
6. **Business Logic**: Status transitions, table occupancy, order totals

### Endpoints da Testare:
- `POST /api/v1/venues/{venueId}/tables` - Creazione tavolo
- `PATCH /api/v1/venues/{venueId}/tables/layout` - Aggiornamento posizioni
- `POST /api/v1/venues/{venueId}/orders` - Creazione ordine
- `PATCH /api/v1/venues/{venueId}/orders/{id}/status` - Cambio stato
- `GET /api/v1/venues/{venueId}/orders/kitchen-display` - KDS orders
- `POST /api/v1/venues/{venueId}/orders/{id}/items` - Aggiunta items

### WebSocket Events da Validare:
- `new_order` - Nuovo ordine broadcast al KDS
- `order_status_changed` - Aggiornamento stato in real-time
- `table_status_changed` - Cambio stato tavolo
- `kitchen_alert` - Notifiche cucina

### Integration Requirements:
- Orders trigger automatic stock movements via FEFO
- Table status updates automatically based on orders
- Real-time communication funzionante
- Performance: order creation < 300ms, status updates < 100ms

La Fase 3 è completa quando tutto il workflow orders funziona end-to-end con real-time updates e integrazione magazzino automatica.