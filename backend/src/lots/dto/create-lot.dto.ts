import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';

export class CreateLotDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Product ID',
  })
  @IsUUID()
  product_id: string;

  @ApiProperty({
    example: 'LOT-2024-001',
    description: 'Unique lot number',
  })
  @IsString()
  @MaxLength(100)
  lot_number: string;

  @ApiProperty({
    example: 100,
    description: 'Initial quantity',
  })
  @IsNumber()
  @Min(0)
  qty_initial: number;

  @ApiProperty({
    example: 1.5,
    description: 'Cost price for this lot',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;

  @ApiProperty({
    example: '2025-12-31',
    description: 'Expiration date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiration_date?: string;

  @ApiProperty({
    example: '2024-01-15',
    description: 'Production date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  production_date?: string;

  @ApiProperty({
    example: '2024-10-22',
    description: 'Received date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  received_date?: string;

  @ApiProperty({
    example: 'PO-2024-123',
    description: 'Supplier reference/order number',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplier_reference?: string;

  @ApiProperty({
    example: 'Stored in warehouse A',
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: { temperature: 4, humidity: 60 },
    description: 'Additional lot metadata',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    example: true,
    description: 'Lot active status',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
