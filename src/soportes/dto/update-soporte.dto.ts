import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSoporteDto {
  @IsDateString()
  @IsOptional()
  fechaRespuesta?: string;

  @IsBoolean()
  @IsOptional()
  resolvio?: boolean;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
