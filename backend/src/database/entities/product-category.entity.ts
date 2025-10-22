import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { Product } from './product.entity';

@Entity('product_categories')
export class ProductCategory extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string; // Hex color for UI

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string; // Icon name/path

  @Column({ type: 'boolean', default: true })
  active: boolean;

  // Relations
  @ManyToOne(() => Venue, (venue) => venue.product_categories)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
