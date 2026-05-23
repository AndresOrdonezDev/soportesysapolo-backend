import { IsString, IsNotEmpty, IsInt, IsPositive, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSoporteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo: string;

  @IsString()
  @IsNotEmpty()
  texto: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  entidadId: number;
}
