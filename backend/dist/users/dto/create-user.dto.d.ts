import { UserRole } from '../../database/enums/user-role.enum';
export declare class CreateUserDto {
    venue_id: string;
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    permissions?: string[];
}
