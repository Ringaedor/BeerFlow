import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ example: 'Demo Birreria' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Via Roma 123, Milano' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    example: {
      currency: 'EUR',
      timezone: 'Europe/Rome',
      tax_rate: 0.22
    }
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
