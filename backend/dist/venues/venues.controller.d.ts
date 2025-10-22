import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
export declare class VenuesController {
    private readonly venuesService;
    constructor(venuesService: VenuesService);
    create(createVenueDto: CreateVenueDto): Promise<import("../database/entities/venue.entity").Venue>;
    findAll(): Promise<import("../database/entities/venue.entity").Venue[]>;
    findOne(id: string): Promise<import("../database/entities/venue.entity").Venue>;
    update(id: string, updateVenueDto: UpdateVenueDto): Promise<import("../database/entities/venue.entity").Venue>;
    remove(id: string): Promise<void>;
}
