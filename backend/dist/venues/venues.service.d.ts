import { Repository } from 'typeorm';
import { Venue } from '../database/entities/venue.entity';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
export declare class VenuesService {
    private readonly venueRepository;
    constructor(venueRepository: Repository<Venue>);
    create(createVenueDto: CreateVenueDto): Promise<Venue>;
    findAll(): Promise<Venue[]>;
    findOne(id: string): Promise<Venue>;
    update(id: string, updateVenueDto: UpdateVenueDto): Promise<Venue>;
    remove(id: string): Promise<void>;
}
