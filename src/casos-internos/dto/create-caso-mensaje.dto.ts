import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCasoMensajeDto {
  @IsString()
  @IsNotEmpty()
  texto: string;
}
