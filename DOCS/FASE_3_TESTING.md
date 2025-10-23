FASE_3_TESTING

# FASE 3 - TESTING ORDER MANAGEMENT & POS SYSTEM

## Obiettivo Testing
Implementare suite di test completa per validare il sistema di gestione ordini, real-time communication WebSocket, integrazione FEFO automatica e business logic del workflow order-to-stock.

## Framework Testing Specializzato
- **Unit Tests**: Jest con mock avanzati per business logic orders
- **Integration Tests**: End-to-end order workflow validation
- **WebSocket Tests**: Real-time communication testing
- **Performance Tests**: Order processing under load
- **Business Logic Tests**: Order status transitions e FEFO integration
- **Concurrency Tests**: Multiple orders e table management

---

## 1. Test Data Factories

### 1.1 Order Factories (src/test/factories/order.factory.ts)
```typescript
import { define } from 'factory.ts';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Table } from '../../database/entities/table.entity';
import { Reservation } from '../../database/entities/reservation.entity';
import { OrderStatus } from '../../database/enums/order-status.enum';
import { OrderItemStatus } from '../../database/enums/order-item-status.enum';
import { TableStatus } from '../../database/enums/table-status.enum';
import { ReservationStatus } from '../../database/enums/reservation-status.enum';

export const OrderFactory = define<Order>(() => {
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
  
  return {
    id: '77777777-7777-7777-7777-777777777777',
    venue_id: '00000000-0000-0000-0000-000000000001',
    table_id: '44444444-4444-4444-4444-444444444444',
    user_id: '00000000-0000-0000-0000-000000000002',
    order_number: orderNumber,
    status: OrderStatus.DRAFT,
    subtotal: 25.00,
    tax_amount: 5.50,
    discount_amount: 0,
    service_charge: 0,
    total: 30.50,
    covers: 2,
    notes: null,
    confirmed_at: null,
    kitchen_started_at: null,
    ready_at: null,
    served_at: null,
    completed_at: null,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
    venue: null,
    table: null,
    user: null,
    items: [],
    payments: [],
  };
});

export const OrderItemFactory = define<OrderItem>(() => ({
  id: '88888888-8888-8888-8888-888888888888',
  order_id: '77777777-7777-7777-7777-777777777777',
  product_id: '33333333-3333-3333-3333-333333333333',
  allocated_lot_id: null,
  quantity: 1,
  unit_price: 8.50,
  total_price: 8.50,
  status: OrderItemStatus.PENDING,
  notes: null,
  kitchen_notes: null,
  preparation_time_estimate: 15,
  started_at: null,
  completed_at: null,
  modifiers: {},
  created_at: new Date(),
  updated_at: new Date(),
  order: null,
  product: null,
  allocatedLot: null,
}));

export const TableFactory = define<Table>(() => ({
  id: '44444444-4444-4444-4444-444444444444',
  venue_id: '00000000-0000-0000-0000-000000000001',
  name: `T${Math.floor(Math.random() * 99) + 1}`,
  seats: 4,
  position_json: { x: 100, y: 100, width: 80, height: 80 },
  status: TableStatus.FREE,
  area: 'main_hall',
  notes: null,
  active: true,
  created_at: new Date(),
  updated_at: new Date(),
  venue: null,
  orders: [],
  reservations: [],
}));

export const ReservationFactory = define<Reservation>(() => {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 2); // 2 hours from now
  
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 2); // 2 hours duration

  return {
    id: '99999999-9999-9999-9999-999999999999',
    venue_id: '00000000-0000-0000-0000-000000000001',
    table_id: '44444444-4444-4444-4444-444444444444',
    customer_name: 'Mario Rossi',
    customer_phone: '+39 123 456 7890',
    customer_email: 'mario.rossi@email.com',
    start_time: startTime,
    end_time: endTime,
    people_count: 4,
    status: ReservationStatus.CONFIRMED,
    source: 'manual',
    notes: null,
    special_requests: null,
    confirmed_at: new Date(),
    cancelled_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    venue: null,
    table: null,
  };
});
```

### 1.2 WebSocket Test Utilities (src/test/utils/websocket-test.util.ts)
```typescript
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

export class WebSocketTestClient {
  private socket: Socket;
  private connected = false;
  private events: Array<{ event: string; data: any; timestamp: Date }> = [];

  constructor(private app: INestApplication, private namespace = '/orders') {}

  async connect(authToken?: string): Promise<void> {
    const serverAddress = await this.app.getUrl();
    const socketUrl = serverAddress.replace('http', 'ws') + this.namespace;

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      auth: authToken ? { token: authToken } : undefined,
    });

    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        this.connected = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        reject(error);
      });

      // Capture all events for testing
      this.socket.onAny((event, data) => {
        this.events.push({
          event,
          data,
          timestamp: new Date(),
        });
      });

      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }

  emit(event: string, data: any): void {
    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit(event, data);
  }

  waitForEvent(eventName: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event '${eventName}' not received within ${timeout}ms`));
      }, timeout);

      this.socket.on(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  getReceivedEvents(): Array<{ event: string; data: any; timestamp: Date }> {
    return [...this.events];
  }

  getEventsByName(eventName: string): Array<{ event: string; data: any; timestamp: Date }> {
    return this.events.filter(e => e.event === eventName);
  }

  clearEvents(): void {
    this.events = [];
  }

  isConnected(): boolean {
    return this.connected;
  }
}
```

---

## 2. Business Logic Unit Tests

### 2.1 Orders Service Tests (src/orders/orders.service.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from '../database/entities/order.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import { Table } from '../database/entities/table.entity';
import { Product } from '../database/entities/product.entity';
import { StockService } from '../stock/stock.service';
import { OrdersGateway } from './orders.gateway';
import { OrderStatus } from '../database/enums/order-status.enum';
import { TableStatus } from '../database/enums/table-status.enum';
import { OrderFactory, OrderItemFactory, TableFactory } from '../test/factories/order.factory';
import { ProductFactory } from '../test/factories/product.factory';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: Repository<Order>;
  let orderItemRepository: Repository<OrderItem>;
  let tableRepository: Repository<Table>;
  let productRepository: Repository<Product>;
  let stockService: StockService;
  let ordersGateway: OrdersGateway;
  let dataSource: DataSource;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockStockService = {
    executeFefoAllocation: jest.fn(),
  };

  const mockOrdersGateway = {
    emitOrderCreated: jest.fn(),
    emitOrderStatusUpdate: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Table),
          useValue: mockRepository,
        },
        {
          provide: StockService,
          useValue: mockStockService,
        },
        {
          provide: OrdersGateway,
          useValue: mockOrdersGateway,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    stockService = module.get<StockService>(StockService);
    ordersGateway = module.get<OrdersGateway>(OrdersGateway);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const venueId = '00000000-0000-0000-0000-000000000001';
    const userId = '00000000-0000-0000-0000-000000000002';
    const createDto = {
      table_id: '44444444-4444-4444-4444-444444444444',
      covers: 2,
      items: [
        {
          product_id: '33333333-3333-3333-3333-333333333333',
          quantity: 2,
          notes: 'No ice',
        },
      ],
    };

    it('should create order successfully', async () => {
      const table = TableFactory.build({ status: TableStatus.FREE });
      const order = OrderFactory.build();
      const product = ProductFactory.build({ price: 8.50 });

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(table) // Table lookup
        .mockResolvedValueOnce(null) // No existing order
        .mockResolvedValueOnce(product); // Product lookup

      mockQueryRunner.manager.create.mockReturnValue(order);
      mockQueryRunner.manager.save.mockResolvedValue(order);

      jest.spyOn(service, 'generateOrderNumber').mockResolvedValue('ORD-20241201-001');
      jest.spyOn(service, 'findOne').mockResolvedValue(order);

      const result = await service.create(venueId, createDto, userId);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      expect(mockOrdersGateway.emitOrderCreated).toHaveBeenCalledWith(order);
      expect(result).toEqual(order);
    });

    it('should throw ConflictException if table has active order', async () => {
      const table = TableFactory.build();
      const existingOrder = OrderFactory.build({ status: OrderStatus.CONFIRMED });

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(table) // Table lookup
        .mockResolvedValueOnce(existingOrder); // Existing active order

      await expect(service.create(venueId, createDto, userId)).rejects.toThrow(
        ConflictException
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should handle order creation without table (takeaway)', async () => {
      const takeawayDto = { ...createDto };
      delete takeawayDto.table_id;

      const order = OrderFactory.build({ table_id: null });
      const product = ProductFactory.build();

      mockQueryRunner.manager.findOne.mockResolvedValue(product);
      mockQueryRunner.manager.create.mockReturnValue(order);
      mockQueryRunner.manager.save.mockResolvedValue(order);

      jest.spyOn(service, 'generateOrderNumber').mockResolvedValue('ORD-20241201-002');
      jest.spyOn(service, 'findOne').mockResolvedValue(order);

      const result = await service.create(venueId, takeawayDto, userId);

      expect(result.table_id).toBeNull();
      expect(mockQueryRunner.manager.update).not.toHaveBeenCalledWith(
        Table,
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('updateStatus', () => {
    const venueId = '00000000-0000-0000-0000-000000000001';
    const orderId = '77777777-7777-7777-7777-777777777777';
    const userId = '00000000-0000-0000-0000-000000000002';

    it('should update status from DRAFT to CONFIRMED', async () => {
      const order = OrderFactory.build({ status: OrderStatus.DRAFT });
      
      jest.spyOn(service, 'findOne').mockResolvedValue(order);
      jest.spyOn(service, 'validateStatusTransition').mockImplementation();

      const updatedOrder = { ...order, status: OrderStatus.CONFIRMED, confirmed_at: new Date() };
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(order).mockResolvedValueOnce(updatedOrder);

      const result = await service.updateStatus(venueId, orderId, OrderStatus.CONFIRMED, userId);

      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(Order, orderId, {
        status: OrderStatus.CONFIRMED,
        confirmed_at: expect.any(Date),
      });

      expect(mockOrdersGateway.emitOrderStatusUpdate).toHaveBeenCalledWith(updatedOrder);
    });

    it('should execute FEFO allocation when status changes to SERVED', async () => {
      const orderItem = OrderItemFactory.build();
      const order = OrderFactory.build({
        status: OrderStatus.READY,
        items: [orderItem],
      });

      jest.spyOn(service, 'findOne').mockResolvedValue(order);
      jest.spyOn(service, 'validateStatusTransition').mockImplementation();

      const movements = [{ lot_id: 'lot-123', quantity: -2 }];
      mockStockService.executeFefoAllocation.mockResolvedValue(movements);

      await service.updateStatus(venueId, orderId, OrderStatus.SERVED, userId);

      expect(mockStockService.executeFefoAllocation).toHaveBeenCalledWith(
        venueId,
        orderItem.product_id,
        orderItem.quantity,
        'order',
        orderId,
        userId,
        expect.stringContaining('Order')
      );

      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(OrderItem, orderItem.id, {
        allocated_lot_id: 'lot-123',
        status: OrderItemStatus.SERVED,
      });
    });

    it('should free table when order is COMPLETED', async () => {
      const order = OrderFactory.build({ 
        status: OrderStatus.SERVED,
        table_id: '44444444-4444-4444-4444-444444444444'
      });

      jest.spyOn(service, 'findOne').mockResolvedValue(order);
      jest.spyOn(service, 'validateStatusTransition').mockImplementation();

      await service.updateStatus(venueId, orderId, OrderStatus.COMPLETED, userId);

      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        Table,
        order.table_id,
        { status: TableStatus.CLEANING }
      );
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const order = OrderFactory.build({ status: OrderStatus.COMPLETED });
      
      jest.spyOn(service, 'findOne').mockResolvedValue(order);

      await expect(
        service.updateStatus(venueId, orderId, OrderStatus.DRAFT, userId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid transitions', () => {
      const validTransitions = [
        { from: OrderStatus.DRAFT, to: OrderStatus.CONFIRMED },
        { from: OrderStatus.CONFIRMED, to: OrderStatus.PREPARING },
        { from: OrderStatus.PREPARING, to: OrderStatus.READY },
        { from: OrderStatus.READY, to: OrderStatus.SERVED },
        { from: OrderStatus.SERVED, to: OrderStatus.COMPLETED },
      ];

      validTransitions.forEach(({ from, to }) => {
        expect(() => service.validateStatusTransition(from, to)).not.toThrow();
      });
    });

    it('should reject invalid transitions', () => {
      const invalidTransitions = [
        { from: OrderStatus.COMPLETED, to: OrderStatus.DRAFT },
        { from: OrderStatus.DRAFT, to: OrderStatus.READY },
        { from: OrderStatus.CANCELLED, to: OrderStatus.CONFIRMED },
      ];

      invalidTransitions.forEach(({ from, to }) => {
        expect(() => service.validateStatusTransition(from, to)).toThrow(BadRequestException);
      });
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate unique order number based on date and count', async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';
      
      mockRepository.count.mockResolvedValue(5); // 5 orders today

      const orderNumber = await service.generateOrderNumber(venueId);

      expect(orderNumber).toMatch(/^ORD-\d{8}-006$/); // 6th order of the day
    });
  });

  describe('business logic calculations', () => {
    it('should calculate preparation time correctly', () => {
      const order = OrderFactory.build({
        confirmed_at: new Date('2024-12-01T10:00:00Z'),
        ready_at: new Date('2024-12-01T10:15:00Z'),
      });

      const preparationTime = service.calculatePreparationTime(order);

      expect(preparationTime).toBe(15); // 15 minutes
    });

    it('should calculate payment status correctly', () => {
      const order = OrderFactory.build({
        total: 50.00,
        payments: [
          { status: 'completed', amount: 30.00 },
          { status: 'completed', amount: 20.00 },
        ],
      });

      const isPaid = service.calculateIsPaid(order);
      const remainingAmount = service.calculateRemainingAmount(order);

      expect(isPaid).toBe(true);
      expect(remainingAmount).toBe(0);
    });

    it('should handle partial payments correctly', () => {
      const order = OrderFactory.build({
        total: 50.00,
        payments: [
          { status: 'completed', amount: 30.00 },
          { status: 'pending', amount: 20.00 }, // Not completed
        ],
      });

      const isPaid = service.calculateIsPaid(order);
      const remainingAmount = service.calculateRemainingAmount(order);

      expect(isPaid).toBe(false);
      expect(remainingAmount).toBe(20.00);
    });
  });
});
```

### 2.2 Tables Service Tests (src/tables/tables.service.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TablesService } from './tables.service';
import { Table } from '../database/entities/table.entity';
import { Order } from '../database/entities/order.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { TableStatus } from '../database/enums/table-status.enum';
import { OrderStatus } from '../database/enums/order-status.enum';
import { ReservationStatus } from '../database/enums/reservation-status.enum';
import { TableFactory, OrderFactory, ReservationFactory } from '../test/factories/order.factory';

describe('TablesService', () => {
  let service: TablesService;
  let tableRepository: Repository<Table>;
  let orderRepository: Repository<Order>;
  let reservationRepository: Repository<Reservation>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        {
          provide: getRepositoryToken(Table),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TablesService>(TablesService);
    tableRepository = module.get<Repository<Table>>(getRepositoryToken(Table));
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    reservationRepository = module.get<Repository<Reservation>>(getRepositoryToken(Reservation));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const venueId = '00000000-0000-0000-0000-000000000001';
    const createDto = {
      name: 'T01',
      seats: 4,
      area: 'main_hall',
      position_json: { x: 100, y: 100 },
    };

    it('should create table successfully', async () => {
      const table = TableFactory.build(createDto);

      mockRepository.findOne.mockResolvedValue(null); // No existing table
      mockRepository.create.mockReturnValue(table);
      mockRepository.save.mockResolvedValue(table);

      const result = await service.create(venueId, createDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          venue_id: venueId,
          name: createDto.name,
          area: createDto.area,
          active: true,
        },
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        venue_id: venueId,
      });

      expect(result).toEqual(table);
    });

    it('should throw ConflictException for duplicate table name in same area', async () => {
      const existingTable = TableFactory.build({ name: createDto.name, area: createDto.area });
      mockRepository.findOne.mockResolvedValue(existingTable);

      await expect(service.create(venueId, createDto)).rejects.toThrow(ConflictException);

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should allow same table name in different areas', async () => {
      const createDtoTerrace = { ...createDto, area: 'terrace' };
      const table = TableFactory.build(createDtoTerrace);

      mockRepository.findOne.mockResolvedValue(null); // No conflict in terrace
      mockRepository.create.mockReturnValue(table);
      mockRepository.save.mockResolvedValue(table);

      const result = await service.create(venueId, createDtoTerrace);

      expect(result.area).toBe('terrace');
    });
  });

  describe('getAvailableTables', () => {
    const venueId = '00000000-0000-0000-0000-000000000001';
    const startTime = new Date('2024-12-01T19:00:00Z');
    const endTime = new Date('2024-12-01T21:00:00Z');
    const peopleCount = 4;

    it('should return tables that can accommodate party size and have no conflicts', async () => {
      const suitableTables = [
        TableFactory.build({ seats: 4, status: TableStatus.FREE }),
        TableFactory.build({ seats: 6, status: TableStatus.FREE }),
        TableFactory.build({ seats: 2, status: TableStatus.FREE }), // Too small
      ];

      const mockQueryBuilder = mockRepository.createQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue(suitableTables.slice(0, 2)); // Only 4+ seats

      // Mock no conflicting reservations
      mockRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getAvailableTables(venueId, startTime, endTime, peopleCount);

      expect(result).toHaveLength(2);
      expect(result.every(table => table.seats >= peopleCount)).toBe(true);
    });

    it('should exclude tables with conflicting reservations', async () => {
      const tables = [
        TableFactory.build({ id: 'table-1', seats: 4 }),
        TableFactory.build({ id: 'table-2', seats: 4 }),
      ];

      const mockQueryBuilder = mockRepository.createQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue(tables);

      // Mock conflicting reservation for table-1
      mockRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          getOne: jest.fn().mockResolvedValue(ReservationFactory.build()), // Conflict
        })
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          getOne: jest.fn().mockResolvedValue(null), // No conflict
        });

      const result = await service.getAvailableTables(venueId, startTime, endTime, peopleCount);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('table-2');
    });

    it('should exclude out-of-service tables', async () => {
      const tables = [
        TableFactory.build({ seats: 4, status: TableStatus.FREE }),
        TableFactory.build({ seats: 4, status: TableStatus.OUT_OF_SERVICE }),
      ];

      const mockQueryBuilder = mockRepository.createQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([tables[0]]); // Query excludes OUT_OF_SERVICE

      mockRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          getOne: jest.fn().mockResolvedValue(null),
        });

      const result = await service.getAvailableTables(venueId, startTime, endTime, peopleCount);

      expect(result).toHaveLength(1);
      expect(result[0].status).not.toBe(TableStatus.OUT_OF_SERVICE);
    });
  });

  describe('enrichTableWithStatus', () => {
    it('should set table status to OCCUPIED when there is an active order', async () => {
      const table = TableFactory.build({ status: TableStatus.FREE });
      const activeOrder = OrderFactory.build({ status: OrderStatus.CONFIRMED });

      mockRepository.findOne
        .mockResolvedValueOnce(activeOrder) // Current order
        .mockResolvedValueOnce(null); // No next reservation

      const enrichedTable = await service.enrichTableWithStatus(table);

      expect(enrichedTable.status).toBe(TableStatus.OCCUPIED);
      expect(enrichedTable.currentOrder).toEqual(activeOrder);
    });

    it('should set table status to BOOKED for upcoming reservations', async () => {
      const table = TableFactory.build({ status: TableStatus.FREE });
      const soonReservation = ReservationFactory.build({
        start_time: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      });

      mockRepository.findOne
        .mockResolvedValueOnce(null) // No current order
        .mockResolvedValueOnce(soonReservation); // Upcoming reservation

      const enrichedTable = await service.enrichTableWithStatus(table);

      expect(enrichedTable.status).toBe(TableStatus.BOOKED);
      expect(enrichedTable.nextReservation).toEqual(soonReservation);
    });

    it('should not change status for distant reservations', async () => {
      const table = TableFactory.build({ status: TableStatus.FREE });
      const distantReservation = ReservationFactory.build({
        start_time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      });

      mockRepository.findOne
        .mockResolvedValueOnce(null) // No current order
        .mockResolvedValueOnce(distantReservation); // Distant reservation

      const enrichedTable = await service.enrichTableWithStatus(table);

      expect(enrichedTable.status).toBe(TableStatus.FREE); // Unchanged
      expect(enrichedTable.nextReservation).toEqual(distantReservation);
    });
  });

  describe('remove', () => {
    const venueId = '00000000-0000-0000-0000-000000000001';
    const tableId = '44444444-4444-4444-4444-444444444444';

    it('should soft delete table when no active orders', async () => {
      const table = TableFactory.build();

      jest.spyOn(service, 'findOne').mockResolvedValue(table);
      mockRepository.findOne.mockResolvedValue(null); // No active order

      await service.remove(venueId, tableId);

      expect(table.active).toBe(false);
      expect(mockRepository.save).toHaveBeenCalledWith(table);
    });

    it('should throw ConflictException when table has active orders', async () => {
      const table = TableFactory.build();
      const activeOrder = OrderFactory.build({ status: OrderStatus.CONFIRMED });

      jest.spyOn(service, 'findOne').mockResolvedValue(table);
      mockRepository.findOne.mockResolvedValue(activeOrder);

      await expect(service.remove(venueId, tableId)).rejects.toThrow(ConflictException);

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
```

---

## 3. WebSocket Integration Tests

### 3.1 Orders Gateway Tests (src/orders/orders.gateway.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { OrdersGateway } from './orders.gateway';
import { WebSocketTestClient } from '../test/utils/websocket-test.util';
import { OrderFactory, TableFactory } from '../test/factories/order.factory';

describe('OrdersGateway', () => {
  let app: INestApplication;
  let gateway: OrdersGateway;
  let client1: WebSocketTestClient;
  let client2: WebSocketTestClient;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [OrdersGateway],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    gateway = moduleFixture.get<OrdersGateway>(OrdersGateway);
    client1 = new WebSocketTestClient(app);
    client2 = new WebSocketTestClient(app);
  });

  afterAll(async () => {
    await client1.disconnect();
    await client2.disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await client1.connect();
    await client2.connect();
    client1.clearEvents();
    client2.clearEvents();
  });

  afterEach(async () => {
    await client1.disconnect();
    await client2.disconnect();
  });

  describe('venue room management', () => {
    it('should allow clients to join venue rooms', async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';
      const userId = '00000000-0000-0000-0000-000000000002';

      client1.emit('join_venue', {
        venue_id: venueId,
        user_id: userId,
        role: 'waiter',
      });

      const joinConfirmation = await client1.waitForEvent('joined_venue');

      expect(joinConfirmation).toEqual({ venue_id: venueId });
      expect(gateway.getVenueConnectionCount(venueId)).toBe(1);
    });

    it('should track multiple clients in same venue', async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';

      client1.emit('join_venue', {
        venue_id: venueId,
        user_id: 'user-1',
        role: 'waiter',
      });

      client2.emit('join_venue', {
        venue_id: venueId,
        user_id: 'user-2',
        role: 'kitchen',
      });

      await Promise.all([
        client1.waitForEvent('joined_venue'),
        client2.waitForEvent('joined_venue'),
      ]);

      expect(gateway.getVenueConnectionCount(venueId)).toBe(2);
    });

    it('should remove clients from venue on leave', async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';

      client1.emit('join_venue', {
        venue_id: venueId,
        user_id: 'user-1',
        role: 'waiter',
      });

      await client1.waitForEvent('joined_venue');
      expect(gateway.getVenueConnectionCount(venueId)).toBe(1);

      client1.emit('leave_venue', { venue_id: venueId });

      // Wait a bit for the leave to process
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(gateway.getVenueConnectionCount(venueId)).toBe(0);
    });
  });

  describe('real-time order events', () => {
    beforeEach(async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';

      // Both clients join same venue
      client1.emit('join_venue', {
        venue_id: venueId,
        user_id: 'waiter-1',
        role: 'waiter',
      });

      client2.emit('join_venue', {
        venue_id: venueId,
        user_id: 'kitchen-1',
        role: 'kitchen',
      });

      await Promise.all([
        client1.waitForEvent('joined_venue'),
        client2.waitForEvent('joined_venue'),
      ]);
    });

    it('should broadcast new order events to all venue clients', async () => {
      const order = OrderFactory.build({
        order_number: 'ORD-20241201-001',
        items: [{ product: { name: 'Test Product' } }],
        table: { name: 'T01' },
        user: { name: 'Mario' },
      });

      // Simulate new order creation
      gateway.emitOrderCreated(order);

      const [client1Event, client2Event] = await Promise.all([
        client1.waitForEvent('new_order'),
        client2.waitForEvent('new_order'),
      ]);

      const expectedEvent = {
        order_id: order.id,
        order_number: order.order_number,
        table_name: order.table.name,
        item_count: 1,
        total: order.total,
        created_by: order.user.name,
        timestamp: order.created_at.toISOString(),
      };

      expect(client1Event).toEqual(expectedEvent);
      expect(client2Event).toEqual(expectedEvent);
    });

    it('should broadcast order status updates', async () => {
      const order = OrderFactory.build({
        status: 'confirmed',
        order_number: 'ORD-20241201-002',
        table: { name: 'T02' },
      });

      gateway.emitOrderStatusUpdate(order);

      const statusUpdate = await client1.waitForEvent('order_status_changed');

      expect(statusUpdate).toEqual({
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        table_name: order.table.name,
        timestamp: expect.any(String),
      });
    });

    it('should broadcast table status changes', async () => {
      const table = TableFactory.build({
        name: 'T03',
        status: 'occupied',
      });

      gateway.emitTableStatusUpdate(table);

      const tableUpdate = await client1.waitForEvent('table_status_changed');

      expect(tableUpdate).toEqual({
        table_id: table.id,
        table_name: table.name,
        status: table.status,
        timestamp: expect.any(String),
      });
    });
  });

  describe('kitchen communication', () => {
    beforeEach(async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';

      client1.emit('join_venue', {
        venue_id: venueId,
        user_id: 'waiter-1',
        role: 'waiter',
      });

      client2.emit('join_venue', {
        venue_id: venueId,
        user_id: 'kitchen-1',
        role: 'kitchen',
      });

      await Promise.all([
        client1.waitForEvent('joined_venue'),
        client2.waitForEvent('joined_venue'),
      ]);
    });

    it('should handle kitchen status updates from clients', async () => {
      const statusUpdate = {
        order_id: '77777777-7777-7777-7777-777777777777',
        status: 'preparing',
        updated_by: 'kitchen-1',
      };

      client2.emit('order_status_update', statusUpdate);

      const broadcastEvent = await client1.waitForEvent('order_status_changed');

      expect(broadcastEvent).toEqual({
        order_id: statusUpdate.order_id,
        status: statusUpdate.status,
        updated_by: statusUpdate.updated_by,
        timestamp: expect.any(String),
      });
    });

    it('should handle kitchen notifications', async () => {
      const notification = {
        message: 'Running low on burger buns',
        priority: 'medium' as const,
      };

      client2.emit('kitchen_notification', notification);

      const alertEvent = await client1.waitForEvent('kitchen_alert');

      expect(alertEvent).toEqual({
        message: notification.message,
        priority: notification.priority,
        from_user: 'kitchen-1',
        timestamp: expect.any(String),
      });
    });

    it('should broadcast high priority kitchen alerts', async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';

      gateway.emitKitchenAlert(venueId, 'Equipment malfunction!', 'high');

      const [alert1, alert2] = await Promise.all([
        client1.waitForEvent('kitchen_alert'),
        client2.waitForEvent('kitchen_alert'),
      ]);

      expect(alert1.message).toBe('Equipment malfunction!');
      expect(alert1.priority).toBe('high');
      expect(alert2.message).toBe('Equipment malfunction!');
      expect(alert2.priority).toBe('high');
    });
  });

  describe('connection management', () => {
    it('should track connected venues', async () => {
      const venue1 = '00000000-0000-0000-0000-000000000001';
      const venue2 = '00000000-0000-0000-0000-000000000002';

      client1.emit('join_venue', {
        venue_id: venue1,
        user_id: 'user-1',
        role: 'waiter',
      });

      client2.emit('join_venue', {
        venue_id: venue2,
        user_id: 'user-2',
        role: 'kitchen',
      });

      await Promise.all([
        client1.waitForEvent('joined_venue'),
        client2.waitForEvent('joined_venue'),
      ]);

      const connectedVenues = gateway.getConnectedVenues();
      expect(connectedVenues).toContain(venue1);
      expect(connectedVenues).toContain(venue2);
    });

    it('should clean up venue rooms on disconnect', async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';

      client1.emit('join_venue', {
        venue_id: venueId,
        user_id: 'user-1',
        role: 'waiter',
      });

      await client1.waitForEvent('joined_venue');
      expect(gateway.getVenueConnectionCount(venueId)).toBe(1);

      // Disconnect client
      await client1.disconnect();

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(gateway.getVenueConnectionCount(venueId)).toBe(0);
    });
  });

  describe('venue isolation', () => {
    it('should not broadcast events across different venues', async () => {
      const venue1 = '00000000-0000-0000-0000-000000000001';
      const venue2 = '00000000-0000-0000-0000-000000000002';

      client1.emit('join_venue', {
        venue_id: venue1,
        user_id: 'user-1',
        role: 'waiter',
      });

      client2.emit('join_venue', {
        venue_id: venue2,
        user_id: 'user-2',
        role: 'kitchen',
      });

      await Promise.all([
        client1.waitForEvent('joined_venue'),
        client2.waitForEvent('joined_venue'),
      ]);

      // Emit order for venue1
      const order = OrderFactory.build({ venue_id: venue1 });
      gateway.emitOrderCreated(order);

      // Client1 should receive, client2 should not
      await client1.waitForEvent('new_order');

      // Wait and check that client2 didn't receive it
      await new Promise(resolve => setTimeout(resolve, 500));
      const client2Events = client2.getEventsByName('new_order');
      expect(client2Events).toHaveLength(0);
    });
  });
});
```

---

## 4. End-to-End Integration Tests

### 4.1 Complete Order Workflow Tests (src/test/e2e/order-workflow.e2e.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Table } from '../../database/entities/table.entity';
import { Product } from '../../database/entities/product.entity';
import { Lot } from '../../database/entities/lot.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { OrderStatus } from '../../database/enums/order-status.enum';
import { TableStatus } from '../../database/enums/table-status.enum';
import { WebSocketTestClient } from '../utils/websocket-test.util';

describe('Complete Order Workflow (E2E)', () => {
  let app: INestApplication;
  let orderRepository: Repository<Order>;
  let tableRepository: Repository<Table>;
  let productRepository: Repository<Product>;
  let lotRepository: Repository<Lot>;
  let stockMovementRepository: Repository<StockMovement>;
  let websocketClient: WebSocketTestClient;

  const venueId = '00000000-0000-0000-0000-000000000001';
  let adminToken: string;
  let waiterToken: string;
  let kitchenToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Get repositories
    orderRepository = moduleFixture.get<Repository<Order>>(getRepositoryToken(Order));
    tableRepository = moduleFixture.get<Repository<Table>>(getRepositoryToken(Table));
    productRepository = moduleFixture.get<Repository<Product>>(getRepositoryToken(Product));
    lotRepository = moduleFixture.get<Repository<Lot>>(getRepositoryToken(Lot));
    stockMovementRepository = moduleFixture.get<Repository<StockMovement>>(getRepositoryToken(StockMovement));

    // Setup WebSocket client
    websocketClient = new WebSocketTestClient(app);

    // Get auth tokens
    adminToken = await getAuthToken('admin@beerflow.demo', 'admin123!');
    waiterToken = await getAuthToken('waiter1@beerflow.demo', 'admin123!');
    kitchenToken = await getAuthToken('chef@beerflow.demo', 'admin123!');
  });

  afterAll(async () => {
    await websocketClient.disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
    await websocketClient.connect();
    websocketClient.emit('join_venue', {
      venue_id: venueId,
      user_id: 'test-user',
      role: 'waiter',
    });
    await websocketClient.waitForEvent('joined_venue');
  });

  afterEach(async () => {
    await websocketClient.disconnect();
  });

  describe('Complete Order Lifecycle', () => {
    let tableId: string;
    let productId: string;
    let lotId: string;

    beforeEach(async () => {
      // Setup test data
      const setupData = await setupCompleteTestData();
      tableId = setupData.tableId;
      productId = setupData.productId;
      lotId = setupData.lotId;
    });

    it('should handle complete order lifecycle from creation to stock deduction', async () => {
      // Step 1: Create order (waiter)
      const createOrderResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          table_id: tableId,
          covers: 2,
          items: [
            {
              product_id: productId,
              quantity: 3,
              notes: 'Extra crispy',
            },
          ],
        })
        .expect(201);

      const orderId = createOrderResponse.body.id;

      // Verify WebSocket event
      const newOrderEvent = await websocketClient.waitForEvent('new_order');
      expect(newOrderEvent.order_id).toBe(orderId);

      // Verify table status changed
      const tableAfterOrder = await tableRepository.findOne({ where: { id: tableId } });
      expect(tableAfterOrder.status).toBe(TableStatus.OCCUPIED);

      // Step 2: Confirm order (waiter)
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      // Verify WebSocket status update
      const statusUpdateEvent = await websocketClient.waitForEvent('order_status_changed');
      expect(statusUpdateEvent.status).toBe('confirmed');

      // Step 3: Kitchen starts preparation
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderStatus.PREPARING })
        .expect(200);

      // Step 4: Kitchen marks ready
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: OrderStatus.READY })
        .expect(200);

      // Step 5: Waiter serves order (triggers stock deduction)
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.SERVED })
        .expect(200);

      // Step 6: Verify stock movements were created
      const stockMovements = await stockMovementRepository.find({
        where: { reference_type: 'order', reference_id: orderId },
      });

      expect(stockMovements).toHaveLength(1);
      expect(stockMovements[0].quantity).toBe(-3); // Negative for OUT movement
      expect(stockMovements[0].lot_id).toBe(lotId);

      // Step 7: Verify lot quantity updated
      const updatedLot = await lotRepository.findOne({ where: { id: lotId } });
      expect(updatedLot.qty_current).toBe(47); // 50 - 3

      // Step 8: Complete order (waiter)
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.COMPLETED })
        .expect(200);

      // Step 9: Verify table status changed to cleaning
      const tableAfterCompletion = await tableRepository.findOne({ where: { id: tableId } });
      expect(tableAfterCompletion.status).toBe(TableStatus.CLEANING);

      // Step 10: Verify complete order data
      const finalOrder = await orderRepository.findOne({
        where: { id: orderId },
        relations: ['items', 'items.product', 'items.allocatedLot'],
      });

      expect(finalOrder.status).toBe(OrderStatus.COMPLETED);
      expect(finalOrder.confirmed_at).toBeTruthy();
      expect(finalOrder.kitchen_started_at).toBeTruthy();
      expect(finalOrder.ready_at).toBeTruthy();
      expect(finalOrder.served_at).toBeTruthy();
      expect(finalOrder.completed_at).toBeTruthy();
      expect(finalOrder.items[0].allocated_lot_id).toBe(lotId);
    });

    it('should handle order cancellation without stock movements', async () => {
      // Create order
      const createOrderResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          table_id: tableId,
          covers: 2,
          items: [
            {
              product_id: productId,
              quantity: 2,
            },
          ],
        })
        .expect(201);

      const orderId = createOrderResponse.body.id;

      // Cancel order before serving
      await request(app.getHttpServer())
        .delete(`/api/v1/venues/${venueId}/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify no stock movements created
      const stockMovements = await stockMovementRepository.find({
        where: { reference_type: 'order', reference_id: orderId },
      });

      expect(stockMovements).toHaveLength(0);

      // Verify lot quantity unchanged
      const lot = await lotRepository.findOne({ where: { id: lotId } });
      expect(lot.qty_current).toBe(50); // Original quantity
    });

    it('should handle adding items to draft order', async () => {
      // Create draft order
      const createOrderResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          table_id: tableId,
          covers: 2,
          items: [
            {
              product_id: productId,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      const orderId = createOrderResponse.body.id;

      // Add more items
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders/${orderId}/items`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          items: [
            {
              product_id: productId,
              quantity: 2,
              notes: 'Extra sauce',
            },
          ],
        })
        .expect(200);

      // Verify order has correct total items
      const updatedOrder = await orderRepository.findOne({
        where: { id: orderId },
        relations: ['items'],
      });

      expect(updatedOrder.items).toHaveLength(2);
      expect(updatedOrder.items.reduce((sum, item) => sum + item.quantity, 0)).toBe(3);
    });

    it('should prevent adding items to confirmed order', async () => {
      // Create and confirm order
      const createOrderResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          table_id: tableId,
          covers: 2,
          items: [{ product_id: productId, quantity: 1 }],
        })
        .expect(201);

      const orderId = createOrderResponse.body.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      // Try to add items - should fail
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders/${orderId}/items`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          items: [{ product_id: productId, quantity: 1 }],
        })
        .expect(400);
    });
  });

  describe('Kitchen Display System Integration', () => {
    it('should show orders for kitchen display', async () => {
      // Create and confirm multiple orders
      const orders = [];
      
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/venues/${venueId}/orders`)
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            covers: 2,
            items: [{ product_id: await setupCompleteTestData().productId, quantity: 1 }],
          })
          .expect(201);

        orders.push(response.body.id);

        // Confirm each order
        await request(app.getHttpServer())
          .patch(`/api/v1/venues/${venueId}/orders/${response.body.id}/status`)
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({ status: OrderStatus.CONFIRMED })
          .expect(200);
      }

      // Get kitchen display orders
      const kdsResponse = await request(app.getHttpServer())
        .get(`/api/v1/venues/${venueId}/orders/kitchen-display`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);

      expect(kdsResponse.body).toHaveLength(3);
      kdsResponse.body.forEach(order => {
        expect([OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY]).toContain(order.status);
      });
    });
  });

  // Helper functions
  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.access_token;
  }

  async function setupCompleteTestData(): Promise<{
    tableId: string;
    productId: string;
    lotId: string;
  }> {
    // Create table
    const table = await tableRepository.save({
      venue_id: venueId,
      name: 'T99',
      seats: 4,
      status: TableStatus.FREE,
      position_json: { x: 100, y: 100 },
      active: true,
    });

    // Create product
    const product = await productRepository.save({
      venue_id: venueId,
      name: 'Test Burger',
      unit: 'pz',
      price: 12.50,
      cost: 6.00,
      active: true,
    });

    // Create lot with stock
    const lot = await lotRepository.save({
      product_id: product.id,
      lot_code: 'TEST-LOT-001',
      qty_init: 50,
      qty_current: 50,
      unit: 'pz',
      cost_per_unit: 6.00,
      expiry_date: new Date('2025-12-31'),
    });

    return {
      tableId: table.id,
      productId: product.id,
      lotId: lot.id,
    };
  }

  async function cleanupTestData() {
    await stockMovementRepository.delete({});
    await orderRepository.delete({});
    await lotRepository.delete({});
    await productRepository.delete({ venue_id: venueId });
    await tableRepository.delete({ venue_id: venueId });
  }
});
```

---

## 5. Performance Tests

### 5.1 Order Processing Performance Tests (src/test/performance/order-performance.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestModule } from '../test.module';
import { performanceTest, PerformanceResult } from '../utils/performance-test.util';

describe('Order Processing Performance Tests', () => {
  let app: INestApplication;
  let adminToken: string;
  let waiterToken: string;

  const venueId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth tokens
    adminToken = await getAuthToken('admin@beerflow.demo', 'admin123!');
    waiterToken = await getAuthToken('waiter1@beerflow.demo', 'admin123!');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Order Creation Performance', () => {
    it('should handle order creation within performance threshold', async () => {
      const createOrderTest = async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/venues/${venueId}/orders`)
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            covers: 2,
            items: [
              {
                product_id: '33333333-3333-3333-3333-333333333333', // Demo product
                quantity: 2,
                notes: 'Performance test',
              },
            ],
          });

        if (response.status !== 201) {
          throw new Error(`Order creation failed with status ${response.status}`);
        }

        return response.body;
      };

      const result: PerformanceResult = await performanceTest(createOrderTest, 50);

      // Performance requirements
      expect(result.averageTime).toBeLessThan(300); // Average < 300ms
      expect(result.maxTime).toBeLessThan(1000); // Max < 1s
      expect(result.successRate).toBeGreaterThan(95); // > 95% success rate

      console.log('Order Creation Performance Results:', {
        averageTime: `${result.averageTime.toFixed(2)}ms`,
        minTime: `${result.minTime}ms`,
        maxTime: `${result.maxTime}ms`,
        successRate: `${result.successRate}%`,
      });
    });
  });

  describe('Order Status Update Performance', () => {
    let orderId: string;

    beforeAll(async () => {
      // Create a test order
      const response = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          covers: 2,
          items: [
            {
              product_id: '33333333-3333-3333-3333-333333333333',
              quantity: 1,
            },
          ],
        });

      orderId = response.body.id;
    });

    it('should handle status updates within performance threshold', async () => {
      const statusUpdateTest = async () => {
        const statuses = ['confirmed', 'preparing', 'ready'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({ status: randomStatus });

        if (response.status !== 200) {
          throw new Error(`Status update failed with status ${response.status}`);
        }

        return response.body;
      };

      const result: PerformanceResult = await performanceTest(statusUpdateTest, 100);

      // Performance requirements
      expect(result.averageTime).toBeLessThan(100); // Average < 100ms
      expect(result.maxTime).toBeLessThan(500); // Max < 500ms
      expect(result.successRate).toBeGreaterThan(98); // > 98% success rate

      console.log('Status Update Performance Results:', {
        averageTime: `${result.averageTime.toFixed(2)}ms`,
        minTime: `${result.minTime}ms`,
        maxTime: `${result.maxTime}ms`,
        successRate: `${result.successRate}%`,
      });
    });
  });

  describe('Kitchen Display System Performance', () => {
    it('should handle KDS queries within performance threshold', async () => {
      const kdsQueryTest = async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/venues/${venueId}/orders/kitchen-display`)
          .set('Authorization', `Bearer ${waiterToken}`);

        if (response.status !== 200) {
          throw new Error(`KDS query failed with status ${response.status}`);
        }

        return response.body;
      };

      const result: PerformanceResult = await performanceTest(kdsQueryTest, 100);

      // Performance requirements
      expect(result.averageTime).toBeLessThan(150); // Average < 150ms
      expect(result.maxTime).toBeLessThan(500); // Max < 500ms
      expect(result.successRate).toBe(100); // 100% success rate

      console.log('KDS Query Performance Results:', {
        averageTime: `${result.averageTime.toFixed(2)}ms`,
        minTime: `${result.minTime}ms`,
        maxTime: `${result.maxTime}ms`,
        successRate: `${result.successRate}%`,
      });
    });
  });

  describe('Concurrent Order Processing', () => {
    it('should handle concurrent order creation without conflicts', async () => {
      const concurrentOrderTest = async (index: number) => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/venues/${venueId}/orders`)
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({
            covers: 1,
            items: [
              {
                product_id: '33333333-3333-3333-3333-333333333333',
                quantity: 1,
                notes: `Concurrent test ${index}`,
              },
            ],
          });

        if (response.status !== 201) {
          throw new Error(`Concurrent order creation failed with status ${response.status}`);
        }

        return response.body;
      };

      const startTime = Date.now();
      
      // Create 20 orders concurrently
      const concurrentPromises = Array.from({ length: 20 }, (_, i) =>
        concurrentOrderTest(i).catch(error => ({ error: error.message }))
      );

      const results = await Promise.all(concurrentPromises);
      const endTime = Date.now();

      const successfulOrders = results.filter(result => !result.error);
      const failedOrders = results.filter(result => result.error);

      console.log(`Concurrent Order Creation Results:
        Total time: ${endTime - startTime}ms
        Successful: ${successfulOrders.length}
        Failed: ${failedOrders.length}
        Success rate: ${(successfulOrders.length / results.length) * 100}%`);

      // At least 90% should succeed
      expect(successfulOrders.length / results.length).toBeGreaterThan(0.9);

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });

  // Helper function
  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.access_token;
  }
});
```

---

## 6. Business Logic Validation Tests

### 6.1 Order Business Rules Tests (src/test/business-logic/order-business-rules.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestModule } from '../test.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from '../../database/entities/order.entity';
import { Table } from '../../database/entities/table.entity';
import { Product } from '../../database/entities/product.entity';
import { Lot } from '../../database/entities/lot.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { OrderStatus } from '../../database/enums/order-status.enum';
import { TableStatus } from '../../database/enums/table-status.enum';

describe('Order Business Rules Validation', () => {
  let app: INestApplication;
  let orderRepository: Repository<Order>;
  let tableRepository: Repository<Table>;
  let productRepository: Repository<Product>;
  let lotRepository: Repository<Lot>;
  let stockMovementRepository: Repository<StockMovement>;

  const venueId = '00000000-0000-0000-0000-000000000001';
  let adminToken: string;
  let waiterToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    orderRepository = moduleFixture.get<Repository<Order>>(getRepositoryToken(Order));
    tableRepository = moduleFixture.get<Repository<Table>>(getRepositoryToken(Table));
    productRepository = moduleFixture.get<Repository<Product>>(getRepositoryToken(Product));
    lotRepository = moduleFixture.get<Repository<Lot>>(getRepositoryToken(Lot));
    stockMovementRepository = moduleFixture.get<Repository<StockMovement>>(getRepositoryToken(StockMovement));

    adminToken = await getAuthToken('admin@beerflow.demo', 'admin123!');
    waiterToken = await getAuthToken('waiter1@beerflow.demo', 'admin123!');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  describe('Table Occupancy Rules', () => {
    it('should prevent creating order on occupied table', async () => {
      const table = await tableRepository.save({
        venue_id: venueId,
        name: 'T01',
        seats: 4,
        status: TableStatus.FREE,
        active: true,
      });

      // Create first order
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          table_id: table.id,
          covers: 2,
          items: [],
        })
        .expect(201);

      // Try to create second order on same table - should fail
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          table_id: table.id,
          covers: 1,
          items: [],
        })
        .expect(409);
    });

    it('should allow creating order on table after previous order is completed', async () => {
      const table = await tableRepository.save({
        venue_id: venueId,
        name: 'T02',
        seats: 4,
        status: TableStatus.FREE,
        active: true,
      });

      // Create and complete first order
      const firstOrderResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          table_id: table.id,
          covers: 2,
          items: [],
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${firstOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.COMPLETED })
        .expect(200);

      // Now should be able to create second order
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          table_id: table.id,
          covers: 3,
          items: [],
        })
        .expect(201);
    });
  });

  describe('Order Status Transition Rules', () => {
    let orderId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          covers: 2,
          items: [],
        });
      orderId = response.body.id;
    });

    it('should enforce valid status transitions', async () => {
      // Valid transitions
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.PREPARING })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.READY })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.SERVED })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.COMPLETED })
        .expect(200);
    });

    it('should reject invalid status transitions', async () => {
      // Cannot go from DRAFT to READY
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.READY })
        .expect(400);

      // Cannot go from CONFIRMED back to DRAFT
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.DRAFT })
        .expect(400);
    });

    it('should allow cancellation from valid states', async () => {
      // Can cancel from DRAFT
      await request(app.getHttpServer())
        .delete(`/api/v1/venues/${venueId}/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Create new order and confirm
      const newOrderResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ covers: 1, items: [] });

      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${newOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      // Can cancel from CONFIRMED
      await request(app.getHttpServer())
        .delete(`/api/v1/venues/${venueId}/orders/${newOrderResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('FEFO Integration Rules', () => {
    let productId: string;
    let lot1Id: string;
    let lot2Id: string;

    beforeEach(async () => {
      const product = await productRepository.save({
        venue_id: venueId,
        name: 'FEFO Test Product',
        unit: 'pz',
        price: 10.00,
        active: true,
      });
      productId = product.id;

      // Create two lots with different expiry dates
      const lot1 = await lotRepository.save({
        product_id: productId,
        lot_code: 'LOT-EARLY',
        qty_init: 20,
        qty_current: 20,
        unit: 'pz',
        cost_per_unit: 5.00,
        expiry_date: new Date('2024-12-15'), // Earlier
      });
      lot1Id = lot1.id;

      const lot2 = await lotRepository.save({
        product_id: productId,
        lot_code: 'LOT-LATE',
        qty_init: 30,
        qty_current: 30,
        unit: 'pz',
        cost_per_unit: 5.00,
        expiry_date: new Date('2024-12-31'), // Later
      });
      lot2Id = lot2.id;
    });

    it('should allocate from earliest expiring lot when order is served', async () => {
      // Create order with the product
      const orderResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          covers: 1,
          items: [
            {
              product_id: productId,
              quantity: 5,
            },
          ],
        })
        .expect(201);

      const orderId = orderResponse.body.id;

      // Progress order to served
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.SERVED })
        .expect(200);

      // Verify stock movement used earliest expiring lot
      const movements = await stockMovementRepository.find({
        where: { reference_type: 'order', reference_id: orderId },
      });

      expect(movements).toHaveLength(1);
      expect(movements[0].lot_id).toBe(lot1Id); // Earlier expiring lot
      expect(movements[0].quantity).toBe(-5);

      // Verify lot quantities
      const lot1After = await lotRepository.findOne({ where: { id: lot1Id } });
      const lot2After = await lotRepository.findOne({ where: { id: lot2Id } });

      expect(lot1After.qty_current).toBe(15); // 20 - 5
      expect(lot2After.qty_current).toBe(30); // Unchanged
    });

    it('should handle FEFO allocation across multiple lots', async () => {
      // Create order requiring more than first lot
      const orderResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          covers: 1,
          items: [
            {
              product_id: productId,
              quantity: 25, // More than lot1 (20)
            },
          ],
        })
        .expect(201);

      const orderId = orderResponse.body.id;

      // Serve order
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.SERVED })
        .expect(200);

      // Should create multiple movements
      const movements = await stockMovementRepository.find({
        where: { reference_type: 'order', reference_id: orderId },
        order: { created_at: 'ASC' },
      });

      expect(movements.length).toBeGreaterThan(1);

      // First movement should deplete lot1
      expect(movements[0].lot_id).toBe(lot1Id);
      expect(movements[0].quantity).toBe(-20);

      // Verify final quantities
      const lot1After = await lotRepository.findOne({ where: { id: lot1Id } });
      const lot2After = await lotRepository.findOne({ where: { id: lot2Id } });

      expect(lot1After.qty_current).toBe(0); // Fully depleted
      expect(lot2After.qty_current).toBe(25); // 30 - 5
    });

    it('should fail to serve order with insufficient stock', async () => {
      // Create order requiring more stock than available
      const orderResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/orders`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          covers: 1,
          items: [
            {
              product_id: productId,
              quantity: 60, // More than total available (50)
            },
          ],
        })
        .expect(201);

      const orderId = orderResponse.body.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      // Should fail when trying to serve
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/${venueId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: OrderStatus.SERVED })
        .expect(400); // Should fail due to insufficient stock
    });
  });

  // Helper functions
  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.access_token;
  }

  async function cleanupTestData() {
    await stockMovementRepository.delete({});
    await orderRepository.delete({});
    await lotRepository.delete({});
    await productRepository.delete({ venue_id: venueId });
    await tableRepository.delete({ venue_id: venueId });
  }
});
```

---

## 7. Test Scripts Package.json

### 7.1 Aggiornare Package.json Scripts per Fase 3
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:unit": "jest --testPathPattern=\\.spec\\.ts$ --testPathIgnorePatterns=integration|e2e|performance",
    "test:integration": "jest --testPathPattern=\\.integration\\.spec\\.ts$",
    "test:e2e": "jest --testPathPattern=\\.e2e\\.spec\\.ts$",
    "test:performance": "jest --testPathPattern=\\.performance\\.spec\\.ts$",
    "test:websocket": "jest --testPathPattern=websocket",
    "test:business": "jest --testPathPattern=business-logic",
    "test:phase3": "jest --testPathPattern=\"(orders|tables|reservations).*\\.(spec|integration|e2e|performance)\\.ts$\"",
    "test:phase3:unit": "npm run test:unit -- --testPathPattern=\"(orders|tables|reservations)\"",
    "test:phase3:integration": "npm run test:integration -- --testPathPattern=\"(orders|tables|reservations)\"",
    "test:phase3:e2e": "npm run test:e2e -- --testPathPattern=\"order-workflow\"",
    "test:phase3:websocket": "npm run test:websocket",
    "test:phase3:performance": "npm run test:performance -- --testPathPattern=\"order\"",
    "test:phase3:all": "npm run test:phase3:unit && npm run test:phase3:integration && npm run test:phase3:e2e && npm run test:phase3:websocket && npm run test:phase3:performance"
  }
}
```

---

## 8. Criteri di Completamento Testing Fase 3

### Unit Tests Requirements (100% Pass Rate):
- **Orders Service**: Tutti i metodi di business logic testati
- **Tables Service**: CRUD e business rules validate
- **WebSocket Gateway**: Event handling e venue isolation
- **Business Logic**: Status transitions e edge cases

### Integration Tests Requirements (100% Pass Rate):
- **Complete Order Workflow**: End-to-end lifecycle validation
- **WebSocket Real-time**: Eventi real-time funzionanti
- **FEFO Integration**: Scarico magazzino automatico
- **Authorization**: Role-based access e venue isolation

### Performance Benchmarks:
- **Order Creation**: < 300ms average, > 95% success rate
- **Status Updates**: < 100ms average, > 98% success rate
- **KDS Queries**: < 150ms average, 100% success rate
- **Concurrent Orders**: 20 concurrent orders < 5s, > 90% success

### WebSocket Tests Requirements:
- **Real-time Events**: new_order, order_status_changed, table_status_changed
- **Venue Isolation**: Cross-venue eventi non propagati
- **Connection Management**: Join/leave venue correttamente
- **Kitchen Communication**: Alerts e notifications funzionanti

### Business Logic Validation:
- **Order Status Transitions**: Solo transizioni valide permesse
- **Table Occupancy**: Prevenzione ordini multipli su stesso tavolo
- **FEFO Integration**: Scarico automatico dal lotto corretto
- **Stock Validation**: Prevenzione overselling

### E2E Test Coverage:
- **Complete Workflow**: Draft → Confirmed → Prepared → Served → Completed
- **Stock Integration**: Automatic FEFO allocation funzionante
- **WebSocket Events**: Real-time updates durante workflow
- **Error Scenarios**: Insufficient stock, invalid transitions, conflicts

La Fase 3 Testing è completa quando tutti i test passano, i benchmark sono rispettati, la business logic è 100% validata e il sistema real-time funziona perfettamente.