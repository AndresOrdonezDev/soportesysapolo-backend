import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SoportesService } from './soportes.service';
import { SoportesController } from './soportes.controller';
import { SoportesGateway } from './soportes.gateway';
import { Soporte } from './entities/soporte.entity';
import { SoporteMensaje } from './entities/soporte-mensaje.entity';
import { SoporteAdjunto } from './entities/soporte-adjunto.entity';
import { UsuarioScope } from '../users/entities/usuario-scope.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Soporte, SoporteMensaje, SoporteAdjunto, UsuarioScope]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'sysapolo_secret_2024'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  providers: [SoportesService, SoportesGateway],
  controllers: [SoportesController],
  exports: [SoportesGateway],
})
export class SoportesModule {}
