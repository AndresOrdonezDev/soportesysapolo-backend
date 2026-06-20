import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateModuloDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}
