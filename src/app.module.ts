import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SoportesModule } from './soportes/soportes.module';
import { EntidadesModule } from './entidades/entidades.module';
import { AreasModule } from './areas/areas.module';
import { User } from './users/entities/user.entity';
import { UsuarioScope } from './users/entities/usuario-scope.entity';
import { Soporte } from './soportes/entities/soporte.entity';
import { SoporteMensaje } from './soportes/entities/soporte-mensaje.entity';
import { SoporteAdjunto } from './soportes/entities/soporte-adjunto.entity';
import { Entidad } from './entidades/entities/entidad.entity';
import { Area } from './areas/entities/area.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USER', 'root'),
        password: config.get<string>('DB_PASS', 'root'),
        database: config.get<string>('DB_NAME', 'soportesysapolo'),
        entities: [User, UsuarioScope, Soporte, SoporteMensaje, SoporteAdjunto, Entidad, Area],
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    SoportesModule,
    EntidadesModule,
    AreasModule,
  ],
})
export class AppModule {}
