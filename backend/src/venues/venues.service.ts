import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ) {}

  create(createVenueDto: Partial<Venue>): Promise<Venue> {
    const venue = this.venueRepository.create(createVenueDto);
    return this.venueRepository.save(venue);
  }

  findAll(): Promise<Venue[]> {
    return this.venueRepository.find();
  }

  async findOne(id: string): Promise<Venue> {
    const venue = await this.venueRepository.findOneBy({ id });
    if (!venue) {
      throw new NotFoundException(`Venue with ID "${id}" not found`);
    }
    return venue;
  }

  async update(id: string, updateVenueDto: Partial<Venue>): Promise<Venue> {
    await this.venueRepository.update(id, updateVenueDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.venueRepository.delete(id);
  }
}
