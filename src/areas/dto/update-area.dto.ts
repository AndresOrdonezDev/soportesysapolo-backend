import { IsString, IsNotEmpty, IsInt, IsPositive, IsOptional } from 'class-validator';

export class UpdateAreaDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  nombre?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  entidadId?: number;
}
