import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  MaxLength,
  IsObject,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Brewery Supplier Ltd', description: 'Supplier name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Contact person name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contact_person?: string;

  @ApiProperty({
    example: 'john@supplier.com',
    description: 'Contact email',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @ApiProperty({
    example: '+39 123 456 7890',
    description: 'Contact phone',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({
    example: 'Via Roma 123, Milan, Italy',
    description: 'Supplier address',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'IT12345678901',
    description: 'VAT number',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vat_number?: string;

  @ApiProperty({
    example: 'Preferred supplier for craft beers',
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: { days: 30, method: 'bank_transfer' },
    description: 'Payment terms configuration',
    required: false,
  })
  @IsOptional()
  @IsObject()
  payment_terms?: Record<string, any>;

  @ApiProperty({
    example: true,
    description: 'Supplier active status',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
