import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entidad } from './entities/entidad.entity';
import { EntidadModulo } from './entities/entidad-modulo.entity';
import { EntidadesService } from './entidades.service';
import { EntidadesController } from './entidades.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Entidad, EntidadModulo])],
  providers: [EntidadesService],
  controllers: [EntidadesController],
  exports: [EntidadesService],
})
export class EntidadesModule {}
