import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasosInternosService } from './casos-internos.service';
import { CasosInternosController } from './casos-internos.controller';
import { CasoInterno } from './entities/caso-interno.entity';
import { CasoInternoMensaje } from './entities/caso-interno-mensaje.entity';
import { CasoInternoAdjunto } from './entities/caso-interno-adjunto.entity';
import { User } from '../users/entities/user.entity';
import { SoportesModule } from '../soportes/soportes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CasoInterno,
      CasoInternoMensaje,
      CasoInternoAdjunto,
      User,
    ]),
    SoportesModule,
  ],
  providers: [CasosInternosService],
  controllers: [CasosInternosController],
})
export class CasosInternosModule {}
