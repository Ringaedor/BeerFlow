import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  MaxLength,
  IsObject,
} from 'class-validator';
import { StockMovementType } from '../../database/enums/stock-movement-type.enum';

export class CreateStockMovementDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Product ID',
  })
  @IsUUID()
  product_id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Lot ID (optional, required if product tracks lots)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  lot_id?: string;

  @ApiProperty({
    example: 'purchase',
    enum: StockMovementType,
    description: 'Type of stock movement',
  })
  @IsEnum(StockMovementType)
  movement_type: StockMovementType;

  @ApiProperty({
    example: 10,
    description: 'Quantity (positive for in, negative for out)',
  })
  @IsNumber()
  quantity: number;

  @ApiProperty({
    example: 1.5,
    description: 'Unit cost at time of movement',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  unit_cost?: number;

  @ApiProperty({
    example: 'ORDER-2024-123',
    description: 'External reference (order ID, sale ID, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;

  @ApiProperty({
    example: 'Received from supplier',
    description: 'Movement notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: { temperature: 4, condition: 'good' },
    description: 'Additional movement metadata',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
