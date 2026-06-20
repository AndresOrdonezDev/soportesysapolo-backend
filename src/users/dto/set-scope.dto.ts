import {
  IsArray,
  ValidateNested,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScopeItemDto {
  @IsInt()
  @IsPositive()
  entidadId: number;
}

export class SetScopeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopeItemDto)
  scopes: ScopeItemDto[];
}
