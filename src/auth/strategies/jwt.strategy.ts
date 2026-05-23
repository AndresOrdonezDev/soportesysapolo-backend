import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'sysapolo_secret_2024'),
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      alias: payload.alias,
      nombre: payload.nombre,
      role: payload.role,
      area: payload.area,
    };
  }
}
