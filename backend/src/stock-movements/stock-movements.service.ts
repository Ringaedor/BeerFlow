import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { Product } from '../database/entities/product.entity';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(venue_id: string): Promise<StockMovement[]> {
    return await this.movementRepository.find({
      where: { venue_id },
      relations: ['product', 'lot', 'user'],
      order: { movement_date: 'DESC' },
      take: 100, // Limit to last 100 movements
    });
  }

  async findByProduct(
    product_id: string,
    venue_id: string,
  ): Promise<StockMovement[]> {
    // Verify product belongs to venue
    const product = await this.productRepository.findOne({
      where: { id: product_id, venue_id },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this venue');
    }

    return await this.movementRepository.find({
      where: { product_id, venue_id },
      relations: ['lot', 'user'],
      order: { movement_date: 'DESC' },
    });
  }

  async findOne(id: string, venue_id: string): Promise<StockMovement> {
    const movement = await this.movementRepository.findOne({
      where: { id, venue_id },
      relations: ['product', 'lot', 'user'],
    });

    if (!movement) {
      throw new NotFoundException('Stock movement not found');
    }

    return movement;
  }

  // Stock movements are immutable - no update or delete operations
}
