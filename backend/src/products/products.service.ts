import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../database/entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(
    createDto: CreateProductDto,
    venue_id: string,
  ): Promise<Product> {
    // Check for duplicate SKU
    const existing = await this.productRepository.findOne({
      where: { sku: createDto.sku },
    });

    if (existing) {
      throw new ConflictException(
        `Product with SKU "${createDto.sku}" already exists`,
      );
    }

    const product = this.productRepository.create({
      ...createDto,
      venue_id,
      current_stock: 0, // Start with zero stock
    });

    return await this.productRepository.save(product);
  }

  async findAll(venue_id: string): Promise<Product[]> {
    return await this.productRepository.find({
      where: { venue_id },
      relations: ['category', 'supplier'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, venue_id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, venue_id },
      relations: ['category', 'supplier', 'lots'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySku(sku: string, venue_id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { sku, venue_id },
      relations: ['category', 'supplier', 'lots'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    updateDto: UpdateProductDto,
    venue_id: string,
  ): Promise<Product> {
    const product = await this.findOne(id, venue_id);

    // Check for duplicate SKU if changing SKU
    if (updateDto.sku && updateDto.sku !== product.sku) {
      const existing = await this.productRepository.findOne({
        where: { sku: updateDto.sku },
      });

      if (existing) {
        throw new ConflictException(
          `Product with SKU "${updateDto.sku}" already exists`,
        );
      }
    }

    // Prevent direct stock updates (must use stock movements)
    if ('current_stock' in updateDto) {
      throw new BadRequestException(
        'Cannot update current_stock directly. Use stock movements instead.',
      );
    }

    Object.assign(product, updateDto);
    return await this.productRepository.save(product);
  }

  async remove(id: string, venue_id: string): Promise<void> {
    const product = await this.findOne(id, venue_id);

    // Soft delete
    product.active = false;
    await this.productRepository.save(product);
  }

  async getLowStockProducts(venue_id: string): Promise<Product[]> {
    return await this.productRepository
      .createQueryBuilder('product')
      .where('product.venue_id = :venue_id', { venue_id })
      .andWhere('product.active = true')
      .andWhere('product.current_stock < product.minimum_stock')
      .orderBy('product.current_stock', 'ASC')
      .getMany();
  }
}
