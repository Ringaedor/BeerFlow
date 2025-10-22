import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Lot } from '../database/entities/lot.entity';
import { Product } from '../database/entities/product.entity';
import { CreateLotDto } from './dto/create-lot.dto';
import { UpdateLotDto } from './dto/update-lot.dto';

@Injectable()
export class LotsService {
  constructor(
    @InjectRepository(Lot)
    private readonly lotRepository: Repository<Lot>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreateLotDto, venue_id: string): Promise<Lot> {
    return await this.dataSource.transaction(async (manager) => {
      // Verify product exists and belongs to venue
      const product = await manager.findOne(Product, {
        where: { id: createDto.product_id, venue_id, active: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found in this venue');
      }

      if (!product.track_lots) {
        throw new BadRequestException(
          'Product does not have lot tracking enabled',
        );
      }

      // Check for duplicate lot number
      const existing = await manager.findOne(Lot, {
        where: { lot_number: createDto.lot_number },
      });

      if (existing) {
        throw new ConflictException(
          `Lot with number "${createDto.lot_number}" already exists`,
        );
      }

      // Create lot
      const lot = manager.create(Lot, {
        ...createDto,
        qty_current: createDto.qty_initial, // Initialize current quantity
      });

      const savedLot = await manager.save(Lot, lot);

      // Update product stock
      product.current_stock = Number(product.current_stock) + Number(createDto.qty_initial);
      await manager.save(Product, product);

      return savedLot;
    });
  }

  async findAll(product_id: string, venue_id: string): Promise<Lot[]> {
    // Verify product belongs to venue
    const product = await this.productRepository.findOne({
      where: { id: product_id, venue_id },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this venue');
    }

    return await this.lotRepository.find({
      where: { product_id },
      order: {
        expiration_date: 'ASC',
        created_at: 'ASC',
      },
    });
  }

  async findOne(id: string, venue_id: string): Promise<Lot> {
    const lot = await this.lotRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!lot) {
      throw new NotFoundException('Lot not found');
    }

    // Verify lot's product belongs to venue
    if (lot.product.venue_id !== venue_id) {
      throw new NotFoundException('Lot not found in this venue');
    }

    return lot;
  }

  async update(
    id: string,
    updateDto: UpdateLotDto,
    venue_id: string,
  ): Promise<Lot> {
    const lot = await this.findOne(id, venue_id);

    // Check for duplicate lot number if changing
    if (updateDto.lot_number && updateDto.lot_number !== lot.lot_number) {
      const existing = await this.lotRepository.findOne({
        where: { lot_number: updateDto.lot_number },
      });

      if (existing) {
        throw new ConflictException(
          `Lot with number "${updateDto.lot_number}" already exists`,
        );
      }
    }

    Object.assign(lot, updateDto);
    return await this.lotRepository.save(lot);
  }

  async remove(id: string, venue_id: string): Promise<void> {
    const lot = await this.findOne(id, venue_id);

    if (Number(lot.qty_current) > 0) {
      throw new BadRequestException(
        'Cannot delete lot with remaining stock. Use stock movements to consume remaining quantity first.',
      );
    }

    // Soft delete
    lot.active = false;
    await this.lotRepository.save(lot);
  }

  async getExpiringSoon(
    venue_id: string,
    days: number = 30,
  ): Promise<Lot[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.lotRepository
      .createQueryBuilder('lot')
      .leftJoinAndSelect('lot.product', 'product')
      .where('product.venue_id = :venue_id', { venue_id })
      .andWhere('lot.active = true')
      .andWhere('lot.qty_current > 0')
      .andWhere('lot.expiration_date IS NOT NULL')
      .andWhere('lot.expiration_date <= :futureDate', { futureDate })
      .orderBy('lot.expiration_date', 'ASC')
      .getMany();
  }
}
