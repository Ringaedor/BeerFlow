import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from '../database/entities/product-category.entity';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(
    @InjectRepository(ProductCategory)
    private readonly categoryRepository: Repository<ProductCategory>,
  ) {}

  async create(
    createDto: CreateProductCategoryDto,
    venue_id: string,
  ): Promise<ProductCategory> {
    // Check for duplicate name in venue
    const existing = await this.categoryRepository.findOne({
      where: { name: createDto.name, venue_id },
    });

    if (existing) {
      throw new ConflictException(
        `Category with name "${createDto.name}" already exists in this venue`,
      );
    }

    const category = this.categoryRepository.create({
      ...createDto,
      venue_id,
    });

    return await this.categoryRepository.save(category);
  }

  async findAll(venue_id: string): Promise<ProductCategory[]> {
    return await this.categoryRepository.find({
      where: { venue_id },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, venue_id: string): Promise<ProductCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id, venue_id },
      relations: ['products'],
    });

    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    return category;
  }

  async update(
    id: string,
    updateDto: UpdateProductCategoryDto,
    venue_id: string,
  ): Promise<ProductCategory> {
    const category = await this.findOne(id, venue_id);

    // Check for duplicate name if changing name
    if (updateDto.name && updateDto.name !== category.name) {
      const existing = await this.categoryRepository.findOne({
        where: { name: updateDto.name, venue_id },
      });

      if (existing) {
        throw new ConflictException(
          `Category with name "${updateDto.name}" already exists in this venue`,
        );
      }
    }

    Object.assign(category, updateDto);
    return await this.categoryRepository.save(category);
  }

  async remove(id: string, venue_id: string): Promise<void> {
    const category = await this.findOne(id, venue_id);

    // Soft delete
    category.active = false;
    await this.categoryRepository.save(category);
  }
}
