import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../database/entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async create(
    createDto: CreateSupplierDto,
    venue_id: string,
  ): Promise<Supplier> {
    const supplier = this.supplierRepository.create({
      ...createDto,
      venue_id,
    });

    return await this.supplierRepository.save(supplier);
  }

  async findAll(venue_id: string): Promise<Supplier[]> {
    return await this.supplierRepository.find({
      where: { venue_id },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, venue_id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, venue_id },
      relations: ['products'],
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async update(
    id: string,
    updateDto: UpdateSupplierDto,
    venue_id: string,
  ): Promise<Supplier> {
    const supplier = await this.findOne(id, venue_id);

    Object.assign(supplier, updateDto);
    return await this.supplierRepository.save(supplier);
  }

  async remove(id: string, venue_id: string): Promise<void> {
    const supplier = await this.findOne(id, venue_id);

    // Soft delete
    supplier.active = false;
    await this.supplierRepository.save(supplier);
  }
}
