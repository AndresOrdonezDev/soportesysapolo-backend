import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsArray,
  IsInt,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCasoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo: string;

  @IsString()
  @IsNotEmpty()
  texto: string;

  @IsIn(['todos', 'individual'])
  visibilidad: 'todos' | 'individual';

  // FormData puede enviar múltiples valores con la misma clave
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  })
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  asignadoAIds?: number[];
}
