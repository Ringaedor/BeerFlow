import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';
import { Lot } from './lot.entity';
import { User } from './user.entity';
import { Venue } from './venue.entity';
import { StockMovementType } from '../enums/stock-movement-type.enum';

@Entity('stock_movements')
export class StockMovement extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid', nullable: true })
  lot_id: string;

  @Column({ type: 'uuid' })
  user_id: string; // Utente che ha effettuato il movimento

  @Column({ type: 'enum', enum: StockMovementType })
  movement_type: StockMovementType;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number; // Quantità (positiva per entrate, negativa per uscite)

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  qty_before: number; // Quantità prima del movimento (audit)

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  qty_after: number; // Quantità dopo il movimento (audit)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unit_cost: number; // Costo unitario al momento del movimento

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_cost: number; // Costo totale del movimento

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string; // Riferimento esterno (es. numero ordine, ID vendita)

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>; // Dati aggiuntivi (es. temperatura, condizioni)

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  movement_date: Date;

  // Relations
  @ManyToOne(() => Venue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Lot, (lot) => lot.stock_movements, { nullable: true })
  @JoinColumn({ name: 'lot_id' })
  lot: Lot;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
