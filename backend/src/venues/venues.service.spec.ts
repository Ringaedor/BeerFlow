import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { Venue } from '../database/entities/venue.entity';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

describe('VenuesService', () => {
  let service: VenuesService;
  let repository: Repository<Venue>;

  const mockVenue: Venue = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Venue',
    address: 'Test Address',
    settings: { currency: 'EUR' },
    subscription_plan: 'basic',
    subscription_expires_at: null,
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    users: [],
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenuesService,
        {
          provide: getRepositoryToken(Venue),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<VenuesService>(VenuesService);
    repository = module.get<Repository<Venue>>(getRepositoryToken(Venue));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a venue successfully', async () => {
      const createVenueDto: CreateVenueDto = {
        name: 'New Venue',
        address: 'New Address',
      };

      mockRepository.create.mockReturnValue(mockVenue);
      mockRepository.save.mockResolvedValue(mockVenue);

      const result = await service.create(createVenueDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createVenueDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockVenue);
      expect(result).toEqual(mockVenue);
    });
  });

  describe('findAll', () => {
    it('should return all active venues', async () => {
      const venues = [mockVenue];
      mockRepository.find.mockResolvedValue(venues);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { active: true },
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(venues);
    });
  });

  describe('findOne', () => {
    it('should return a venue when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockVenue);

      const result = await service.findOne(mockVenue.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockVenue.id, active: true },
      });
      expect(result).toEqual(mockVenue);
    });

    it('should throw NotFoundException when venue not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a venue successfully', async () => {
      const updateVenueDto: UpdateVenueDto = { name: 'Updated Name' };
      const updatedVenue = { ...mockVenue, ...updateVenueDto };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockVenue);
      mockRepository.save.mockResolvedValue(updatedVenue);

      const result = await service.update(mockVenue.id, updateVenueDto);

      expect(service.findOne).toHaveBeenCalledWith(mockVenue.id);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateVenueDto.name);
    });
  });

  describe('remove', () => {
    it('should soft delete a venue', async () => {
      const deletedVenue = { ...mockVenue, active: false };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockVenue);
      mockRepository.save.mockResolvedValue(deletedVenue);

      await service.remove(mockVenue.id);

      expect(service.findOne).toHaveBeenCalledWith(mockVenue.id);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ active: false }),
      );
    });
  });
});
