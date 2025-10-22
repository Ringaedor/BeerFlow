import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { ProductCategory } from './product-category.entity';
import { Supplier } from './supplier.entity';
import { Lot } from './lot.entity';
import { ProductType } from '../enums/product-type.enum';
import { UnitOfMeasure } from '../enums/unit-of-measure.enum';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid', nullable: true })
  category_id: string;

  @Column({ type: 'uuid', nullable: true })
  supplier_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string; // Stock Keeping Unit

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ProductType, default: ProductType.OTHER })
  product_type: ProductType;

  @Column({ type: 'enum', enum: UnitOfMeasure, default: UnitOfMeasure.PIECE })
  unit_of_measure: UnitOfMeasure;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cost_price: number; // Prezzo di costo unitario

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sell_price: number; // Prezzo di vendita unitario

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_stock: number; // Stock corrente totale (somma di tutti i lotti)

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  minimum_stock: number; // Scorta minima per alert

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  optimal_stock: number; // Scorta ottimale

  @Column({ type: 'boolean', default: false })
  track_lots: boolean; // Se true, traccia lotti e scadenze (FEFO enabled)

  @Column({ type: 'varchar', length: 255, nullable: true })
  barcode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image_url: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>; // Dati aggiuntivi (ABV, IBU, etc.)

  @Column({ type: 'boolean', default: true })
  active: boolean;

  // Relations
  @ManyToOne(() => Venue, (venue) => venue.products)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => ProductCategory, (category) => category.products, {
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: ProductCategory;

  @ManyToOne(() => Supplier, (supplier) => supplier.products, {
    nullable: true,
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @OneToMany(() => Lot, (lot) => lot.product)
  lots: Lot[];
}
