import { IsString, IsNotEmpty, IsEnum, IsOptional, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  alias: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value))
  email?: string | null;
}
