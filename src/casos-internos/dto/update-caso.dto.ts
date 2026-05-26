import { IsOptional, IsIn, IsArray, IsInt, IsPositive } from 'class-validator';

export class UpdateCasoDto {
  @IsOptional()
  @IsIn(['todos', 'individual'])
  visibilidad?: 'todos' | 'individual';

  // JSON body — los IDs ya llegan como array de números
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  asignadoAIds?: number[];

  @IsOptional()
  @IsIn(['abierto', 'cerrado'])
  estado?: 'abierto' | 'cerrado';
}
