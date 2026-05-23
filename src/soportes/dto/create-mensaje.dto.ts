import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMensajeDto {
  @IsString()
  @IsNotEmpty()
  texto: string;
}
