import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modulo } from './entities/modulo.entity';
import { ModulosService } from './modulos.service';
import { ModulosController } from './modulos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Modulo])],
  providers: [ModulosService],
  controllers: [ModulosController],
  exports: [ModulosService],
})
export class ModulosModule {}
