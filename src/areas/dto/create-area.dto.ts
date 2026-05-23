import { IsString, IsNotEmpty, IsInt, IsPositive } from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  @IsPositive()
  entidadId: number;
}
