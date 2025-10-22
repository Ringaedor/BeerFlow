import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.WAITER
  })
  role: UserRole;

  @Column({ type: 'jsonb', default: [] })
  permissions: string[];

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  last_login: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password_reset_token: string;

  @Column({ type: 'timestamptz', nullable: true })
  password_reset_expires: Date;

  // Relations
  @ManyToOne(() => Venue, venue => venue.users)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;
}
