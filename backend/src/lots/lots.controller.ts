import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LotsService } from './lots.service';
import { CreateLotDto } from './dto/create-lot.dto';
import { UpdateLotDto } from './dto/update-lot.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VenueGuard } from '../common/guards/venue.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../database/enums/user-role.enum';

@ApiTags('lots')
@ApiBearerAuth()
@Controller('lots')
@UseGuards(JwtAuthGuard, VenueGuard, RolesGuard)
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create lot' })
  @ApiResponse({ status: 201, description: 'Lot created successfully' })
  @ApiResponse({ status: 409, description: 'Lot number already exists' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  create(@Body() createDto: CreateLotDto, @Request() req) {
    return this.lotsService.create(createDto, req.venueId);
  }

  @Get('expiring-soon')
  @ApiOperation({ summary: 'Get lots expiring soon' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Days to look ahead (default 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Expiring lots retrieved successfully',
  })
  getExpiringSoon(@Request() req, @Query('days') days?: string) {
    const daysAhead = days ? parseInt(days, 10) : 30;
    return this.lotsService.getExpiringSoon(req.venueId, daysAhead);
  }

  @Get('product/:product_id')
  @ApiOperation({ summary: 'Get all lots for a product' })
  @ApiResponse({ status: 200, description: 'Lots retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findAll(@Param('product_id') product_id: string, @Request() req) {
    return this.lotsService.findAll(product_id, req.venueId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lot by ID' })
  @ApiResponse({ status: 200, description: 'Lot retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lot not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.lotsService.findOne(id, req.venueId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update lot' })
  @ApiResponse({ status: 200, description: 'Lot updated successfully' })
  @ApiResponse({ status: 404, description: 'Lot not found' })
  @ApiResponse({ status: 409, description: 'Lot number already exists' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLotDto,
    @Request() req,
  ) {
    return this.lotsService.update(id, updateDto, req.venueId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete lot (soft delete)' })
  @ApiResponse({ status: 204, description: 'Lot deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lot not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete lot with remaining stock',
  })
  async remove(@Param('id') id: string, @Request() req) {
    await this.lotsService.remove(id, req.venueId);
  }
}
