import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../database/entities/user.entity';
export interface JwtPayload {
    sub: string;
    email: string;
    venue_id: string;
    role: string;
    permissions: string[];
}
export interface LoginResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        venue_id: string;
    };
}
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<User | null>;
    login(user: User): Promise<LoginResponse>;
    validateToken(payload: JwtPayload): Promise<User>;
}
