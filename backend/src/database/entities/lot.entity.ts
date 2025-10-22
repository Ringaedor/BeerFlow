import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';
import { StockMovement } from './stock-movement.entity';

@Entity('lots')
export class Lot extends BaseEntity {
  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  lot_number: string; // Numero lotto univoco

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  qty_initial: number; // Quantità iniziale del lotto

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  qty_current: number; // Quantità corrente disponibile

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cost_price: number; // Prezzo di costo specifico del lotto

  @Column({ type: 'date', nullable: true })
  expiration_date: Date; // Data di scadenza (critica per FEFO)

  @Column({ type: 'date', nullable: true })
  production_date: Date; // Data di produzione

  @Column({ type: 'date', nullable: true })
  received_date: Date; // Data di ricezione

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplier_reference: string; // Riferimento ordine fornitore

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>; // Dati aggiuntivi specifici del lotto

  @Column({ type: 'boolean', default: true })
  active: boolean;

  // Relations
  @ManyToOne(() => Product, (product) => product.lots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => StockMovement, (movement) => movement.lot)
  stock_movements: StockMovement[];
}
