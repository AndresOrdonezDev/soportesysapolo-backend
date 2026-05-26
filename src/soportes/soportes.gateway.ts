import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Soporte } from './entities/soporte.entity';
import { UsuarioScope } from '../users/entities/usuario-scope.entity';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
})
export class SoportesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Mapa userId → set de socketIds activos (un usuario puede tener varias pestañas)
  private userSockets = new Map<number, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UsuarioScope)
    private readonly scopeRepo: Repository<UsuarioScope>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) { client.disconnect(); return; }

      const secret = this.configService.get<string>('JWT_SECRET', 'sysapolo_secret_2024');
      const payload = this.jwtService.verify(token, { secret });
      client.data.user = payload;

      // Registrar socket del usuario
      const userId: number = payload.sub;
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Room personal
      client.join(`room-user-${userId}`);

      if (payload.role === 'admin') {
        client.join('room-admin');
      } else if (payload.role === 'soporte') {
        client.join('room-soporte-todos');
        const scopes = await this.scopeRepo.find({ where: { usuarioId: userId } });
        scopes.forEach((s) => client.join(`room-entidad-${s.entidadId}`));
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId: number = client.data.user?.sub;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  // Devuelve los socketIds del emisor para excluirlos con except()
  senderSocketIds(senderUserId: number): string[] {
    return Array.from(this.userSockets.get(senderUserId) ?? []);
  }

  /** Nuevo ticket creado — no notificar al creador */
  emitNuevoSoporte(soporte: Soporte, senderUserId: number): void {
    const excluded = this.senderSocketIds(senderUserId);
    const emit = (room: string) => {
      this.server.to(room).except(excluded).emit('nuevo-soporte', soporte);
    };
    emit('room-admin');
    if (soporte.entidadId) emit(`room-entidad-${soporte.entidadId}`);
  }

  /** Nuevo mensaje en el hilo — no notificar al que envió */
  emitNuevoMensaje(soporte: Soporte, senderUserId: number): void {
    const excluded = this.senderSocketIds(senderUserId);
    const emit = (room: string) => {
      this.server.to(room).except(excluded).emit('soporte-actualizado', soporte);
    };
    emit('room-admin');
    if (soporte.entidadId) emit(`room-entidad-${soporte.entidadId}`);
    if (soporte.usuarioId) emit(`room-user-${soporte.usuarioId}`);
  }

  /** Ticket eliminado */
  emitSoporteEliminado(id: number, usuarioId?: number, entidadId?: number): void {
    this.server.to('room-admin').emit('soporte-eliminado', { id });
    if (usuarioId) {
      this.server.to(`room-user-${usuarioId}`).emit('soporte-eliminado', { id });
    }
    if (entidadId) {
      this.server.to(`room-entidad-${entidadId}`).emit('soporte-eliminado', { id });
    }
  }
}
