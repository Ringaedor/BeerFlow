import { JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare const getJwtConfig: (configService: ConfigService) => JwtModuleOptions;
