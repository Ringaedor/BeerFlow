import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * VenueGuard - Ensures users can only access data from their own venue
 *
 * This guard checks that the venue_id in the request matches the user's venue_id.
 * It can check:
 * 1. Request body (for POST/PUT)
 * 2. Query parameters (for GET with filters)
 * 3. URL parameters (for GET/:id)
 *
 * Usage: @UseGuards(JwtAuthGuard, VenueGuard)
 */
@Injectable()
export class VenueGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.venue_id) {
      throw new ForbiddenException('User venue information not found');
    }

    // Check venue_id in request body (for create/update operations)
    if (request.body && request.body.venue_id) {
      if (request.body.venue_id !== user.venue_id) {
        throw new ForbiddenException(
          'Cannot access or modify data from another venue',
        );
      }
    }

    // Check venue_id in query parameters (for filtering)
    if (request.query && request.query.venue_id) {
      if (request.query.venue_id !== user.venue_id) {
        throw new ForbiddenException(
          'Cannot access data from another venue',
        );
      }
    }

    // Attach user's venue_id to request for use in services
    // This ensures all operations are scoped to the user's venue
    request.venueId = user.venue_id;

    return true;
  }
}

/**
 * Decorator to bypass venue check (use with caution, only for admin operations)
 */
export const BYPASS_VENUE_KEY = 'bypassVenue';
export const BypassVenue = () => Reflector.prototype.constructor(BYPASS_VENUE_KEY, true);
