import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ProductType } from '../../database/enums/product-type.enum';
import { UnitOfMeasure } from '../../database/enums/unit-of-measure.enum';

export class CreateProductDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Category ID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Supplier ID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  supplier_id?: string;

  @ApiProperty({ example: 'Pilsner Beer 33cl', description: 'Product name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'BEER-PIL-33',
    description: 'Stock Keeping Unit (unique)',
  })
  @IsString()
  @MaxLength(100)
  sku: string;

  @ApiProperty({
    example: 'Premium pilsner beer',
    description: 'Product description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'beer',
    enum: ProductType,
    description: 'Product type',
  })
  @IsEnum(ProductType)
  product_type: ProductType;

  @ApiProperty({
    example: 'bottle',
    enum: UnitOfMeasure,
    description: 'Unit of measure',
  })
  @IsEnum(UnitOfMeasure)
  unit_of_measure: UnitOfMeasure;

  @ApiProperty({
    example: 1.5,
    description: 'Cost price per unit',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;

  @ApiProperty({
    example: 3.5,
    description: 'Selling price per unit',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sell_price?: number;

  @ApiProperty({
    example: 10,
    description: 'Minimum stock level for alerts',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_stock?: number;

  @ApiProperty({
    example: 50,
    description: 'Optimal stock level',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  optimal_stock?: number;

  @ApiProperty({
    example: true,
    description: 'Enable lot tracking and FEFO',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  track_lots?: boolean;

  @ApiProperty({
    example: '8001234567890',
    description: 'Product barcode',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  barcode?: string;

  @ApiProperty({
    example: 'https://cdn.example.com/products/beer.jpg',
    description: 'Product image URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  image_url?: string;

  @ApiProperty({
    example: { abv: 5.2, ibu: 35, style: 'Pilsner' },
    description: 'Additional product metadata',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    example: true,
    description: 'Product active status',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
