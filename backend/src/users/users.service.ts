import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { password, ...rest } = createUserDto;

    const user = this.userRepository.create({
      ...rest,
      passwordHash: password, // Passiamo la password al campo che verrà hashata dall'hook
    });

    const savedUser = await this.userRepository.save(user);

    // Rimuoviamo la password hashata e il metodo prima di restituire l'utente
    const { passwordHash, hashPassword, ...result } = savedUser;
    return result;
  }
}
