import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class UpdateModuloDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  nombre?: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}
