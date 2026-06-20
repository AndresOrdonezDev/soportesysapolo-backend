import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEmail,
  IsDateString,
  IsInt,
} from 'class-validator';

export class UpdateEntidadDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  nombre?: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;

  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  correosNotificacion?: string[];

  @IsDateString()
  @IsOptional()
  fechaVencimientoSoporte?: string;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  moduloIds?: number[];
}
