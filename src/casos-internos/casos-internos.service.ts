import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import {
  CasoInterno,
  CasoInternoEstado,
  CasoInternoVisibilidad,
} from './entities/caso-interno.entity';
import { CasoInternoMensaje } from './entities/caso-interno-mensaje.entity';
import { CasoInternoAdjunto, AdjuntoTipo } from './entities/caso-interno-adjunto.entity';
import { CreateCasoDto } from './dto/create-caso.dto';
import { CreateCasoMensajeDto } from './dto/create-caso-mensaje.dto';
import { UpdateCasoDto } from './dto/update-caso.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { SoportesGateway } from '../soportes/soportes.gateway';

@Injectable()
export class CasosInternosService {
  constructor(
    @InjectRepository(CasoInterno)
    private casosRepo: Repository<CasoInterno>,
    @InjectRepository(CasoInternoMensaje)
    private mensajesRepo: Repository<CasoInternoMensaje>,
    @InjectRepository(CasoInternoAdjunto)
    private adjuntosRepo: Repository<CasoInternoAdjunto>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private readonly gateway: SoportesGateway,
  ) {}

  // ── Helpers internos ──────────────────────────────────────────────────────

  private async loadFull(id: number): Promise<CasoInterno> {
    const caso = await this.casosRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.creadoPor', 'creadoPor')
      .leftJoinAndSelect('c.asignadoA', 'asignadoA')
      .leftJoinAndSelect('c.mensajes', 'mensajes')
      .leftJoinAndSelect('mensajes.usuario', 'mUsuario')
      .leftJoinAndSelect('mensajes.adjuntos', 'adjuntos')
      .where('c.id = :id', { id })
      .orderBy('mensajes.fechaCreacion', 'ASC')
      .getOne();
    if (!caso) throw new NotFoundException('Caso interno no encontrado');
    return caso;
  }

  private hasAccess(caso: CasoInterno, user: User): boolean {
    if (user.role === UserRole.ADMIN) return true;
    return (
      caso.creadoPorId === user.id ||
      caso.visibilidad === CasoInternoVisibilidad.TODOS ||
      (caso.asignadoA ?? []).some((u) => u.id === user.id)
    );
  }

  private checkAccess(caso: CasoInterno, user: User): void {
    if (!this.hasAccess(caso, user)) {
      throw new ForbiddenException('Sin acceso a este caso');
    }
  }

  private emitCasoEvent(
    event: string,
    caso: CasoInterno,
    excludeUserId?: number,
  ): void {
    const excluded = excludeUserId
      ? this.gateway.senderSocketIds(excludeUserId)
      : [];
    const emit = (room: string) =>
      this.gateway.server.to(room).except(excluded).emit(event, caso);

    emit('room-admin');
    if (caso.visibilidad === CasoInternoVisibilidad.TODOS) {
      emit('room-soporte-todos');
    } else {
      if (caso.creadoPorId !== excludeUserId)
        emit(`room-user-${caso.creadoPorId}`);
      for (const asignado of caso.asignadoA ?? []) {
        if (asignado.id !== excludeUserId) emit(`room-user-${asignado.id}`);
      }
    }
  }

  // ── findAll ───────────────────────────────────────────────────────────────

  async findAll(user: User): Promise<CasoInterno[]> {
    const qb = this.casosRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.creadoPor', 'creadoPor')
      .leftJoinAndSelect('c.asignadoA', 'asignadoA')
      .leftJoinAndSelect('c.mensajes', 'mensajes')
      .leftJoinAndSelect('mensajes.usuario', 'mUsuario')
      .orderBy('c.fechaCreacion', 'DESC');

    if (user.role === UserRole.SOPORTE) {
      // Subquery para evitar que el LEFT JOIN de asignadoA filtre registros del array
      qb.where(
        `(c.creadoPorId = :uid
          OR c.visibilidad = :vis
          OR c.id IN (
            SELECT cia.casoId FROM caso_interno_asignaciones cia
            WHERE cia.usuarioId = :uid
          ))`,
        { uid: user.id, vis: CasoInternoVisibilidad.TODOS },
      );
    }

    return qb.getMany();
  }

  // ── findOne ───────────────────────────────────────────────────────────────

  async findOne(id: number, user: User): Promise<CasoInterno> {
    const caso = await this.loadFull(id);
    this.checkAccess(caso, user);
    return caso;
  }

  // ── findEquipo ────────────────────────────────────────────────────────────

  async findEquipo(): Promise<Pick<User, 'id' | 'nombre' | 'role'>[]> {
    return this.usersRepo.find({
      where: [
        { role: UserRole.ADMIN, activo: true },
        { role: UserRole.SOPORTE, activo: true },
      ],
      order: { nombre: 'ASC' },
      select: ['id', 'nombre', 'role'],
    });
  }

  // ── create ────────────────────────────────────────────────────────────────

  async create(
    dto: CreateCasoDto,
    files: Express.Multer.File[],
    user: User,
  ): Promise<CasoInterno> {
    const caso = this.casosRepo.create({
      titulo: dto.titulo,
      estado: CasoInternoEstado.ABIERTO,
      creadoPorId: user.id,
      visibilidad: dto.visibilidad as CasoInternoVisibilidad,
    });

    if (
      dto.visibilidad === 'individual' &&
      dto.asignadoAIds?.length
    ) {
      caso.asignadoA = await this.usersRepo.findBy({
        id: In(dto.asignadoAIds),
      });
    } else {
      caso.asignadoA = [];
    }

    const savedCaso = await this.casosRepo.save(caso);

    const mensaje = this.mensajesRepo.create({
      casoId: savedCaso.id,
      usuarioId: user.id,
      texto: dto.texto,
    });
    const savedMensaje = await this.mensajesRepo.save(mensaje);

    if (files?.length) {
      await this.saveAdjuntos(files, savedMensaje.id, savedCaso.id);
    }

    const full = await this.loadFull(savedCaso.id);
    this.emitCasoEvent('nuevo-caso', full, user.id);
    return full;
  }

  // ── addMensaje ────────────────────────────────────────────────────────────

  async addMensaje(
    casoId: number,
    dto: CreateCasoMensajeDto,
    files: Express.Multer.File[],
    user: User,
  ): Promise<CasoInterno> {
    const caso = await this.loadFull(casoId);
    this.checkAccess(caso, user);

    if (caso.estado === CasoInternoEstado.CERRADO) {
      throw new ForbiddenException(
        'El caso está cerrado. Reabre el caso para añadir mensajes.',
      );
    }

    const mensaje = this.mensajesRepo.create({
      casoId,
      usuarioId: user.id,
      texto: dto.texto,
    });
    const savedMensaje = await this.mensajesRepo.save(mensaje);

    if (files?.length) {
      await this.saveAdjuntos(files, savedMensaje.id, casoId);
    }

    const full = await this.loadFull(casoId);
    this.emitCasoEvent('caso-actualizado', full, user.id);
    return full;
  }

  // ── update (reasignar / cambiar estado) ───────────────────────────────────

  async update(
    id: number,
    dto: UpdateCasoDto,
    user: User,
  ): Promise<CasoInterno> {
    const caso = await this.loadFull(id);
    this.checkAccess(caso, user);

    if (user.role !== UserRole.ADMIN && caso.creadoPorId !== user.id) {
      throw new ForbiddenException(
        'Solo el creador o el administrador pueden modificar este caso',
      );
    }

    if (dto.visibilidad === 'todos') {
      caso.visibilidad = CasoInternoVisibilidad.TODOS;
      caso.asignadoA = [];
    } else if (dto.visibilidad === 'individual') {
      caso.visibilidad = CasoInternoVisibilidad.INDIVIDUAL;
      if (dto.asignadoAIds !== undefined) {
        caso.asignadoA = dto.asignadoAIds.length
          ? await this.usersRepo.findBy({ id: In(dto.asignadoAIds) })
          : [];
      }
    } else if (dto.asignadoAIds !== undefined) {
      // Actualiza solo los asignados sin cambiar la visibilidad
      caso.asignadoA = dto.asignadoAIds.length
        ? await this.usersRepo.findBy({ id: In(dto.asignadoAIds) })
        : [];
      if (caso.asignadoA.length > 0) {
        caso.visibilidad = CasoInternoVisibilidad.INDIVIDUAL;
      }
    }

    if (dto.estado !== undefined) {
      caso.estado = dto.estado as CasoInternoEstado;
    }

    await this.casosRepo.save(caso);
    const full = await this.loadFull(id);
    this.emitCasoEvent('caso-actualizado', full);
    return full;
  }

  // ── remove ────────────────────────────────────────────────────────────────

  async remove(id: number, user: User): Promise<{ message: string }> {
    const caso = await this.loadFull(id);
    this.checkAccess(caso, user);

    if (user.role !== UserRole.ADMIN && caso.creadoPorId !== user.id) {
      throw new ForbiddenException(
        'Solo el creador o el administrador pueden eliminar este caso',
      );
    }

    for (const msg of caso.mensajes ?? []) {
      for (const adj of msg.adjuntos ?? []) {
        this.deleteFile(adj.ruta);
      }
    }

    const casoId = caso.id;
    const creadoPorId = caso.creadoPorId;
    const visibilidad = caso.visibilidad;
    const asignadoIds = (caso.asignadoA ?? []).map((u) => u.id);
    await this.casosRepo.remove(caso);

    this.gateway.server.to('room-admin').emit('caso-eliminado', { id: casoId });
    if (visibilidad === CasoInternoVisibilidad.TODOS) {
      this.gateway.server
        .to('room-soporte-todos')
        .emit('caso-eliminado', { id: casoId });
    } else {
      if (creadoPorId)
        this.gateway.server
          .to(`room-user-${creadoPorId}`)
          .emit('caso-eliminado', { id: casoId });
      for (const uid of asignadoIds) {
        this.gateway.server
          .to(`room-user-${uid}`)
          .emit('caso-eliminado', { id: casoId });
      }
    }

    return { message: 'Caso eliminado' };
  }

  // ── getAdjunto ────────────────────────────────────────────────────────────

  async getAdjunto(
    adjuntoId: number,
    user: User,
  ): Promise<{ filePath: string; adjunto: CasoInternoAdjunto }> {
    const adjunto = await this.adjuntosRepo.findOne({
      where: { id: adjuntoId },
      relations: ['mensaje'],
    });
    if (!adjunto) throw new NotFoundException('Adjunto no encontrado');

    // loadFull garantiza que asignadoA esté cargado para checkAccess
    const caso = await this.loadFull(adjunto.mensaje.casoId);
    this.checkAccess(caso, user);

    const filePath = path.join(
      process.cwd(),
      'uploads',
      ...adjunto.ruta.split('/'),
    );
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado en el servidor');
    }
    return { filePath, adjunto };
  }

  // ── Helpers de archivos ───────────────────────────────────────────────────

  private async saveAdjuntos(
    files: Express.Multer.File[],
    mensajeId: number,
    casoId: number,
  ): Promise<void> {
    const finalDir = path.join(
      process.cwd(),
      'uploads',
      'casos',
      String(casoId),
      String(mensajeId),
    );
    fs.mkdirSync(finalDir, { recursive: true });

    for (const file of files) {
      const ext = path.extname(file.originalname);
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const finalPath = path.join(finalDir, filename);
      fs.renameSync(file.path, finalPath);

      const ruta = `casos/${casoId}/${mensajeId}/${filename}`;
      const adjunto = this.adjuntosRepo.create({
        mensajeId,
        nombre: file.originalname,
        tipo: this.getTipoFromMime(file.mimetype) as AdjuntoTipo,
        ruta,
        mimeType: file.mimetype,
        tamanio: file.size,
      });
      await this.adjuntosRepo.save(adjunto);
    }
  }

  private getTipoFromMime(mime: string): AdjuntoTipo {
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf') return 'pdf';
    if (
      mime === 'application/msword' ||
      mime ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
      return 'word';
    return 'otro';
  }

  private deleteFile(ruta: string): void {
    try {
      const filePath = path.join(
        process.cwd(),
        'uploads',
        ...ruta.split('/'),
      );
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // no interrumpir si el archivo ya no existe
    }
  }
}
