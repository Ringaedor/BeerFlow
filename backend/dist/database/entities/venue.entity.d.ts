import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { ProductCategory } from './product-category.entity';
import { Supplier } from './supplier.entity';
import { Product } from './product.entity';
export declare class Venue extends BaseEntity {
    name: string;
    address: string;
    settings: Record<string, any>;
    subscription_plan: string;
    subscription_expires_at: Date;
    active: boolean;
    users: User[];
    product_categories: ProductCategory[];
    suppliers: Supplier[];
    products: Product[];
}
