import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { User } from '../database/entities/user.entity';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, req: any): Promise<import("./auth.service").LoginResponse>;
    getProfile(user: User): {
        venue_id: string;
        email: string;
        name: string;
        role: import("../database/enums/user-role.enum").UserRole;
        permissions: string[];
        active: boolean;
        last_login: Date;
        password_reset_token: string;
        password_reset_expires: Date;
        venue: import("../database/entities/venue.entity").Venue;
        id: string;
        created_at: Date;
        updated_at: Date;
    };
}
