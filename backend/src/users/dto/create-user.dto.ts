import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsArray,
  IsOptional,
  MinLength
} from 'class-validator';
import { UserRole } from '../../database/enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsUUID()
  @IsNotEmpty()
  venue_id: string;

  @ApiProperty({ example: 'user@beerflow.demo' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'securePassword123!' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Mario Rossi' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.WAITER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: ['orders.create', 'orders.read'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}
