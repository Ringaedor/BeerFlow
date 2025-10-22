import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { ProductCategory } from './product-category.entity';
import { Supplier } from './supplier.entity';
import { Product } from './product.entity';

@Entity('venues')
export class Venue extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({
    type: 'jsonb',
    default: {
      currency: 'EUR',
      timezone: 'Europe/Rome',
      tax_rate: 0.22,
      default_language: 'it-IT'
    }
  })
  settings: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'basic' })
  subscription_plan: string;

  @Column({ type: 'timestamptz', nullable: true })
  subscription_expires_at: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  // Relations
  @OneToMany(() => User, user => user.venue)
  users: User[];

  @OneToMany(() => ProductCategory, category => category.venue)
  product_categories: ProductCategory[];

  @OneToMany(() => Supplier, supplier => supplier.venue)
  suppliers: Supplier[];

  @OneToMany(() => Product, product => product.venue)
  products: Product[];
}
