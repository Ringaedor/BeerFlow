import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StockMovementsService } from './stock-movements.service';
import { StockService } from '../stock/stock.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VenueGuard } from '../common/guards/venue.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../database/enums/user-role.enum';

@ApiTags('stock-movements')
@ApiBearerAuth()
@Controller('stock-movements')
@UseGuards(JwtAuthGuard, VenueGuard, RolesGuard)
export class StockMovementsController {
  constructor(
    private readonly movementsService: StockMovementsService,
    private readonly stockService: StockService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create stock movement (atomic transaction)' })
  @ApiResponse({
    status: 201,
    description: 'Stock movement created successfully',
  })
  @ApiResponse({ status: 404, description: 'Product or lot not found' })
  @ApiResponse({ status: 400, description: 'Invalid movement or negative stock' })
  async create(@Body() createDto: CreateStockMovementDto, @Request() req) {
    return await this.stockService.executeStockMovement(
      {
        venue_id: req.venueId,
        ...createDto,
      },
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock movements' })
  @ApiResponse({
    status: 200,
    description: 'Stock movements retrieved successfully',
  })
  findAll(@Request() req) {
    return this.movementsService.findAll(req.venueId);
  }

  @Get('product/:product_id')
  @ApiOperation({ summary: 'Get stock movements for a product' })
  @ApiResponse({
    status: 200,
    description: 'Product movements retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findByProduct(@Param('product_id') product_id: string, @Request() req) {
    return this.movementsService.findByProduct(product_id, req.venueId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock movement by ID' })
  @ApiResponse({
    status: 200,
    description: 'Stock movement retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Stock movement not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.movementsService.findOne(id, req.venueId);
  }

  @Get('stock-summary/:product_id')
  @ApiOperation({ summary: 'Get stock summary with FEFO lot information' })
  @ApiResponse({
    status: 200,
    description: 'Stock summary retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getStockSummary(@Param('product_id') product_id: string, @Request() req) {
    return this.stockService.getStockSummary(product_id, req.venueId);
  }
}
