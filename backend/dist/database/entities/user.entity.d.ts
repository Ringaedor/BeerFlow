import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { UserRole } from '../enums/user-role.enum';
export declare class User extends BaseEntity {
    venue_id: string;
    email: string;
    password_hash: string;
    name: string;
    role: UserRole;
    permissions: string[];
    active: boolean;
    last_login: Date;
    password_reset_token: string;
    password_reset_expires: Date;
    venue: Venue;
}
