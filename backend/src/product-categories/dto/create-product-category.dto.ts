import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateProductCategoryDto {
  @ApiProperty({ example: 'Beers', description: 'Category name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'All beer products',
    description: 'Category description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '#FFD700',
    description: 'Hex color for UI',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiProperty({
    example: 'beer-icon',
    description: 'Icon name/path',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiProperty({
    example: true,
    description: 'Category active status',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
