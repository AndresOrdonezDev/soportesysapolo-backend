import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { UsuarioScope } from './entities/usuario-scope.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetScopeDto } from './dto/set-scope.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UsuarioScope)
    private scopeRepository: Repository<UsuarioScope>,
  ) {}

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.usersRepository.find({
      relations: ['scope', 'scope.entidad', 'scope.area'],
      order: { createdAt: 'DESC' },
    });
    return users.map(({ password, ...rest }) => rest as User);
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['scope', 'scope.entidad', 'scope.area'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async findByAlias(alias: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { alias } });
  }

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existing = await this.findByAlias(createUserDto.alias);
    if (existing) throw new ConflictException('El alias ya está en uso');

    const defaultPassword = await bcrypt.hash('usuario123', 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: defaultPassword,
      role: createUserDto.role || UserRole.USER,
    });
    try {
      const saved = await this.usersRepository.save(user);
      const { password, ...result } = saved;
      return result as User;
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('El alias ya está en uso');
      }
      throw err;
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const user = await this.findOne(id);
    // If alias changed, check it is not already taken by another user
    if (updateUserDto.alias && updateUserDto.alias !== user.alias) {
      const existing = await this.findByAlias(updateUserDto.alias);
      if (existing) throw new ConflictException('El alias ya está en uso');
    }
    Object.assign(user, updateUserDto);
    try {
      const saved = await this.usersRepository.save(user);
      const { password, ...result } = saved;
      return result as User;
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('El alias ya está en uso');
      }
      throw err;
    }
  }

  async resetPassword(id: number): Promise<{ message: string }> {
    const user = await this.findOne(id);
    user.password = await bcrypt.hash('usuario123', 10);
    await this.usersRepository.save(user);
    return { message: 'Contraseña restablecida a usuario123' };
  }

  async changePassword(id: number, newPassword: string): Promise<{ message: string }> {
    const user = await this.findOne(id);
    user.password = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);
    return { message: 'Contraseña actualizada correctamente' };
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    return { message: 'Usuario eliminado' };
  }

  async getScope(userId: number): Promise<UsuarioScope[]> {
    await this.findOne(userId);
    return this.scopeRepository.find({
      where: { usuarioId: userId },
      relations: ['entidad', 'area'],
    });
  }

  async setScope(userId: number, dto: SetScopeDto): Promise<UsuarioScope[]> {
    await this.findOne(userId);

    // Elimina todos los scope actuales del usuario
    await this.scopeRepository.delete({ usuarioId: userId });

    if (!dto.scopes.length) return [];

    const entries = dto.scopes.map((item) =>
      this.scopeRepository.create({
        usuarioId: userId,
        entidadId: item.entidadId,
        areaId: item.areaId ?? null,
      }),
    );

    const saved = await this.scopeRepository.save(entries);

    return this.scopeRepository.find({
      where: saved.map((s) => ({ id: s.id })),
      relations: ['entidad', 'area'],
    });
  }
}
