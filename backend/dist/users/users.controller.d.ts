import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../database/enums/user-role.enum';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<{
        venue_id: string;
        email: string;
        name: string;
        role: UserRole;
        permissions: string[];
        active: boolean;
        last_login: Date;
        password_reset_token: string;
        password_reset_expires: Date;
        venue: import("../database/entities/venue.entity").Venue;
        id: string;
        created_at: Date;
        updated_at: Date;
    }>;
    findAll(): Promise<{
        venue_id: string;
        email: string;
        name: string;
        role: UserRole;
        permissions: string[];
        active: boolean;
        last_login: Date;
        password_reset_token: string;
        password_reset_expires: Date;
        venue: import("../database/entities/venue.entity").Venue;
        id: string;
        created_at: Date;
        updated_at: Date;
    }[]>;
    findOne(id: string): Promise<{
        venue_id: string;
        email: string;
        name: string;
        role: UserRole;
        permissions: string[];
        active: boolean;
        last_login: Date;
        password_reset_token: string;
        password_reset_expires: Date;
        venue: import("../database/entities/venue.entity").Venue;
        id: string;
        created_at: Date;
        updated_at: Date;
    }>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
        venue_id: string;
        email: string;
        name: string;
        role: UserRole;
        permissions: string[];
        active: boolean;
        last_login: Date;
        password_reset_token: string;
        password_reset_expires: Date;
        venue: import("../database/entities/venue.entity").Venue;
        id: string;
        created_at: Date;
        updated_at: Date;
    }>;
    remove(id: string): Promise<void>;
}
