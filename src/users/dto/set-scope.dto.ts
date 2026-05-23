import {
  IsArray,
  ValidateNested,
  IsInt,
  IsPositive,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScopeItemDto {
  @IsInt()
  @IsPositive()
  entidadId: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  areaId?: number;
}

export class SetScopeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopeItemDto)
  scopes: ScopeItemDto[];
}
