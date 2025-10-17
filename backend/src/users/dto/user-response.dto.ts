export class UserResponseDto {
  id: string;
  email: string;
  name?: string;
  role: string;
  active: boolean;
  venueId: string;
  createdAt: Date;
  updatedAt: Date;
}