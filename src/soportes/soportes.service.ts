import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';
import { Soporte, SoporteEstado } from './entities/soporte.entity';
import { SoporteMensaje } from './entities/soporte-mensaje.entity';
import { SoporteAdjunto, AdjuntoTipo } from './entities/soporte-adjunto.entity';
import { UsuarioScope } from '../users/entities/usuario-scope.entity';
import { CreateSoporteDto } from './dto/create-soporte.dto';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { SoportesGateway } from './soportes.gateway';

@Injectable()
export class SoportesService {
  constructor(
    @InjectRepository(Soporte)
    private soportesRepo: Repository<Soporte>,
    @InjectRepository(SoporteMensaje)
    private mensajesRepo: Repository<SoporteMensaje>,
    @InjectRepository(SoporteAdjunto)
    private adjuntosRepo: Repository<SoporteAdjunto>,
    @InjectRepository(UsuarioScope)
    private scopeRepo: Repository<UsuarioScope>,
    private readonly gateway: SoportesGateway,
  ) {}

  // ── Helpers de scope ──────────────────────────────────────────────────────

  private async getScopeEntidadIds(userId: number): Promise<number[]> {
    const scopes = await this.scopeRepo.find({ where: { usuarioId: userId } });
    return scopes.map((s) => s.entidadId);
  }

  private async checkSoporteAccess(soporte: Soporte, user: User): Promise<void> {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.SOPORTE) {
      const ids = await this.getScopeEntidadIds(user.id);
      if (!soporte.entidadId || !ids.includes(soporte.entidadId)) {
        throw new ForbiddenException('Sin acceso a esta solicitud');
      }
      return;
    }
    if (soporte.usuarioId !== user.id) {
      throw new ForbiddenException('Sin acceso a esta solicitud');
    }
  }

  // ── Carga interna con hilo completo ───────────────────────────────────────

  private async loadFull(id: number): Promise<Soporte> {
    const soporte = await this.soportesRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.usuario', 'usuario')
      .leftJoinAndSelect('usuario.scope', 'uScope')
      .leftJoinAndSelect('uScope.area', 'uScopeArea')
      .leftJoinAndSelect('s.entidad', 'entidad')
      .leftJoinAndSelect('s.mensajes', 'mensajes')
      .leftJoinAndSelect('mensajes.usuario', 'mUsuario')
      .leftJoinAndSelect('mUsuario.scope', 'mScope')
      .leftJoinAndSelect('mScope.area', 'mScopeArea')
      .leftJoinAndSelect('mensajes.adjuntos', 'adjuntos')
      .where('s.id = :id', { id })
      .orderBy('mensajes.fechaCreacion', 'ASC')
      .getOne();
    if (!soporte) throw new NotFoundException('Solicitud no encontrada');
    return soporte;
  }

  // ── findAll ───────────────────────────────────────────────────────────────

  async findAll(
    user: User,
    estado?: string,
    entidadId?: number,
  ): Promise<Soporte[]> {
    const qb = this.soportesRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.usuario', 'usuario')
      .leftJoinAndSelect('s.entidad', 'entidad')
      .leftJoinAndSelect('s.mensajes', 'mensajes')
      .leftJoinAndSelect('mensajes.usuario', 'mUsuario')
      .orderBy('s.fechaSolicitud', 'ASC');

    if (user.role === UserRole.ADMIN) {
      if (entidadId) qb.andWhere('s.entidadId = :entidadId', { entidadId });
      if (estado && estado !== 'todos')
        qb.andWhere('s.estado = :estado', { estado });
    } else if (user.role === UserRole.SOPORTE) {
      const scopeIds = await this.getScopeEntidadIds(user.id);
      if (!scopeIds.length) return [];

      const validIds =
        entidadId && scopeIds.includes(entidadId) ? [entidadId] : scopeIds;
      qb.andWhere('s.entidadId IN (:...entidadIds)', { entidadIds: validIds });

      if (estado && estado !== 'todos')
        qb.andWhere('s.estado = :estado', { estado });
    } else {
      qb.andWhere('s.usuarioId = :userId', { userId: user.id });
      if (estado && estado !== 'todos')
        qb.andWhere('s.estado = :estado', { estado });
    }

    return qb.getMany();
  }

  // ── findOne ───────────────────────────────────────────────────────────────

  async findOne(id: number, user: User): Promise<Soporte> {
    const soporte = await this.loadFull(id);
    await this.checkSoporteAccess(soporte, user);
    return soporte;
  }

  // ── create ────────────────────────────────────────────────────────────────

  async create(
    dto: CreateSoporteDto,
    files: Express.Multer.File[],
    user: User,
  ): Promise<Soporte> {
    if (user.role === UserRole.SOPORTE) {
      throw new ForbiddenException('El rol soporte no puede crear solicitudes');
    }

    // Verifica que el usuario tenga scope en esa entidad (si es user)
    if (user.role === UserRole.USER) {
      const scopeIds = await this.getScopeEntidadIds(user.id);
      if (!scopeIds.includes(dto.entidadId)) {
        throw new ForbiddenException('No tienes asignada esa entidad');
      }
    }

    const soporte = this.soportesRepo.create({
      titulo: dto.titulo,
      estado: SoporteEstado.PENDIENTE,
      usuarioId: user.id,
      entidadId: dto.entidadId,
    });
    const savedSoporte = await this.soportesRepo.save(soporte);

    // Primer mensaje del hilo
    const mensaje = this.mensajesRepo.create({
      soporteId: savedSoporte.id,
      usuarioId: user.id,
      texto: dto.texto,
    });
    const savedMensaje = await this.mensajesRepo.save(mensaje);

    if (files?.length) {
      await this.saveAdjuntos(files, savedMensaje.id, savedSoporte.id);
    }

    const full = await this.loadFull(savedSoporte.id);
    this.gateway.emitNuevoSoporte(full, user.id);
    return full;
  }

  // ── addMensaje ────────────────────────────────────────────────────────────

  async addMensaje(
    soporteId: number,
    dto: CreateMensajeDto,
    files: Express.Multer.File[],
    user: User,
  ): Promise<Soporte> {
    const soporte = await this.loadFull(soporteId);
    await this.checkSoporteAccess(soporte, user);

    const mensajes = soporte.mensajes ?? [];
    const lastMsg = mensajes[mensajes.length - 1];

    if (user.role === UserRole.SOPORTE) {
      // Soporte solo responde si el último mensaje NO es de soporte
      if (lastMsg) {
        const lastRole = lastMsg.usuario?.role;
        if (lastRole === UserRole.SOPORTE || lastRole === UserRole.ADMIN) {
          throw new ForbiddenException(
            'Ya respondiste. Esperando réplica del usuario.',
          );
        }
      }
      soporte.estado = SoporteEstado.RESUELTO;
    } else if (user.role === UserRole.USER) {
      // Usuario solo replica si el último mensaje es de soporte/admin
      if (!lastMsg || lastMsg.usuarioId === user.id) {
        throw new ForbiddenException(
          'Ya enviaste tu mensaje. Esperando respuesta del soporte.',
        );
      }
      const lastRole = lastMsg.usuario?.role;
      if (lastRole === UserRole.USER) {
        throw new ForbiddenException(
          'Ya enviaste tu mensaje. Esperando respuesta del soporte.',
        );
      }
      soporte.estado = SoporteEstado.PENDIENTE;
    }
    // Admin responde siempre, no cambia estado automáticamente

    const mensaje = this.mensajesRepo.create({
      soporteId,
      usuarioId: user.id,
      texto: dto.texto,
    });
    const savedMensaje = await this.mensajesRepo.save(mensaje);

    if (files?.length) {
      await this.saveAdjuntos(files, savedMensaje.id, soporteId);
    }

    // Actualiza solo el estado — sin pasar la colección mensajes para evitar
    // que TypeORM cascade-nullifique mensajes que no están en el array cargado.
    await this.soportesRepo.update(soporteId, { estado: soporte.estado });

    const full = await this.loadFull(soporteId);
    this.gateway.emitNuevoMensaje(full, user.id);
    return full;
  }

  // ── remove ────────────────────────────────────────────────────────────────

  async remove(id: number, user: User): Promise<{ message: string }> {
    const soporte = await this.loadFull(id);
    await this.checkSoporteAccess(soporte, user);

    if (user.role === UserRole.SOPORTE) {
      throw new ForbiddenException('El rol soporte no puede eliminar solicitudes');
    }

    if (user.role === UserRole.USER) {
      const tieneMovimiento = (soporte.mensajes ?? []).some(
        (m) => m.usuarioId !== soporte.usuarioId,
      );
      if (tieneMovimiento) {
        throw new ForbiddenException(
          'No se puede eliminar una solicitud con seguimiento. Solo el administrador puede hacerlo.',
        );
      }
    }

    // Eliminar archivos físicos de todas las mensajes
    for (const msg of soporte.mensajes ?? []) {
      for (const adj of msg.adjuntos ?? []) {
        this.deleteFile(adj.ruta);
      }
    }

    const soporteId = soporte.id;
    const usuarioId = soporte.usuarioId;
    const entidadId = soporte.entidadId;
    await this.soportesRepo.remove(soporte);
    this.gateway.emitSoporteEliminado(soporteId, usuarioId, entidadId);
    return { message: 'Solicitud eliminada' };
  }

  // ── getAdjunto ────────────────────────────────────────────────────────────

  async getAdjunto(
    adjuntoId: number,
    user: User,
  ): Promise<{ filePath: string; adjunto: SoporteAdjunto }> {
    const adjunto = await this.adjuntosRepo.findOne({
      where: { id: adjuntoId },
      relations: ['mensaje'],
    });
    if (!adjunto) throw new NotFoundException('Adjunto no encontrado');

    // Carga el soporte para verificar acceso
    const soporte = await this.soportesRepo.findOne({
      where: { id: adjunto.mensaje.soporteId },
    });
    if (!soporte) throw new NotFoundException('Solicitud no encontrada');

    await this.checkSoporteAccess(soporte, user);

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

  // ── exportToExcel ─────────────────────────────────────────────────────────

  async exportToExcel(
    desde: string,
    hasta: string,
    entidadIds: number[] | null,
    user: User,
  ): Promise<Buffer> {
    const qb = this.soportesRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.usuario', 'usuario')
      .leftJoinAndSelect('usuario.scope', 'exScope')
      .leftJoinAndSelect('exScope.area', 'exScopeArea')
      .leftJoinAndSelect('s.entidad', 'entidad')
      .leftJoinAndSelect('s.mensajes', 'mensajes')
      .leftJoinAndSelect('mensajes.usuario', 'mUsuario')
      .where('DATE(s.fechaSolicitud) BETWEEN :desde AND :hasta', { desde, hasta })
      .orderBy('s.fechaSolicitud', 'DESC')
      .addOrderBy('mensajes.fechaCreacion', 'ASC');

    if (user.role === UserRole.SOPORTE) {
      const scopeIds = await this.getScopeEntidadIds(user.id);
      const validIds =
        entidadIds?.length
          ? entidadIds.filter((id) => scopeIds.includes(id))
          : scopeIds;
      if (!validIds.length) return Buffer.from([]);
      qb.andWhere('s.entidadId IN (:...entidadIds)', { entidadIds: validIds });
      qb.innerJoin(
        's.mensajes',
        'miMsg',
        'miMsg.usuarioId = :soporteId',
        { soporteId: user.id },
      );
    } else if (entidadIds?.length) {
      qb.andWhere('s.entidadId IN (:...entidadIds)', { entidadIds });
    }

    const soportes = await qb.getMany();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SysApolo';
    workbook.created = new Date();

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } };

    // ── Hoja 1: Resumen de Tickets ────────────────────────────────────────
    const sheet1 = workbook.addWorksheet('Resumen de Tickets');

    sheet1.columns = [
      { header: 'ID',                   key: 'id',              width: 8  },
      { header: 'Título / Asunto',      key: 'titulo',          width: 38 },
      { header: 'Estado',               key: 'estado',          width: 12 },
      { header: 'Entidad',              key: 'entidad',         width: 28 },
      { header: 'Solicitante',          key: 'solicitante',     width: 25 },
      { header: 'Área / Oficina',       key: 'area',            width: 20 },
      { header: 'Teléfono',             key: 'telefono',        width: 15 },
      { header: 'Fecha Solicitud',      key: 'fechaSolicitud',  width: 20 },
      { header: 'Descripción inicial',  key: 'descripcion',     width: 45 },
      { header: 'Atendido por',         key: 'atendidoPor',     width: 25 },
      { header: 'Fecha 1ª respuesta',   key: 'fechaRespuesta',  width: 20 },
      { header: 'Tiempo de respuesta',  key: 'tiempoRespuesta', width: 20 },
      { header: 'Total mensajes',       key: 'totalMensajes',   width: 15 },
      { header: 'Última actividad',     key: 'ultimaActividad', width: 20 },
    ];

    sheet1.getRow(1).fill = headerFill;
    sheet1.getRow(1).font = headerFont;
    sheet1.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(1).height = 20;
    sheet1.getColumn('descripcion').alignment = { wrapText: true, vertical: 'top' };

    soportes.forEach((s) => {
      const msgs = (s.mensajes ?? []).slice().sort(
        (a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime(),
      );

      const firstMsg       = msgs[0];
      const lastMsg        = msgs[msgs.length - 1];
      const firstSoporteMsg = msgs.find(
        (m) => m.usuario?.role === 'soporte' || m.usuario?.role === 'admin',
      );

      let tiempoRespuesta = '—';
      if (firstSoporteMsg) {
        const diffMs   = new Date(firstSoporteMsg.fechaCreacion).getTime() - new Date(s.fechaSolicitud).getTime();
        const diffMins = Math.max(0, Math.floor(diffMs / 60000));
        if (diffMins < 60) {
          tiempoRespuesta = `${diffMins} min`;
        } else {
          const h = Math.floor(diffMins / 60);
          const m = diffMins % 60;
          tiempoRespuesta = m > 0 ? `${h}h ${m}min` : `${h}h`;
        }
      }

      const row = sheet1.addRow({
        id:              s.id,
        titulo:          s.titulo || '',
        estado:          s.estado === 'resuelto' ? 'Atendido' : 'Pendiente',
        entidad:         s.entidad?.nombre || '',
        solicitante:     s.usuario?.nombre || '',
        area:            s.usuario?.scope?.[0]?.area?.nombre || '',
        telefono:        s.usuario?.telefono || '',
        fechaSolicitud:  s.fechaSolicitud  ? new Date(s.fechaSolicitud).toLocaleString('es-CO')  : '',
        descripcion:     firstMsg?.texto   || '',
        atendidoPor:     firstSoporteMsg?.usuario?.nombre || '—',
        fechaRespuesta:  firstSoporteMsg   ? new Date(firstSoporteMsg.fechaCreacion).toLocaleString('es-CO') : '—',
        tiempoRespuesta,
        totalMensajes:   msgs.length,
        ultimaActividad: lastMsg?.fechaCreacion ? new Date(lastMsg.fechaCreacion).toLocaleString('es-CO') : '',
      });

      // Colorear estado
      const estadoCell = row.getCell('estado');
      if (s.estado === 'resuelto') {
        estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdcfce7' } };
        estadoCell.font = { color: { argb: 'FF166534' }, bold: true };
      } else {
        estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfef9c3' } };
        estadoCell.font = { color: { argb: 'FF92400e' }, bold: true };
      }
    });

    // ── Hoja 2: Detalle de Hilos ──────────────────────────────────────────
    const sheet2 = workbook.addWorksheet('Detalle de Hilos');

    sheet2.columns = [
      { header: 'ID Ticket',  key: 'idTicket',    width: 10 },
      { header: 'Título',     key: 'titulo',      width: 30 },
      { header: 'Entidad',    key: 'entidad',     width: 25 },
      { header: 'Estado',     key: 'estado',      width: 12 },
      { header: '# Mensaje',  key: 'numMensaje',  width: 10 },
      { header: 'Fecha',      key: 'fecha',       width: 20 },
      { header: 'Autor',      key: 'autor',       width: 25 },
      { header: 'Rol',        key: 'rol',         width: 12 },
      { header: 'Contenido',  key: 'contenido',   width: 65 },
    ];

    sheet2.getRow(1).fill = headerFill;
    sheet2.getRow(1).font = headerFont;
    sheet2.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet2.getRow(1).height = 20;
    sheet2.getColumn('contenido').alignment = { wrapText: true, vertical: 'top' };

    soportes.forEach((s) => {
      const msgs = (s.mensajes ?? []).slice().sort(
        (a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime(),
      );

      msgs.forEach((msg, index) => {
        const role     = msg.usuario?.role;
        const rolLabel = role === 'admin' ? 'Admin' : role === 'soporte' ? 'Soporte' : 'Usuario';

        const row = sheet2.addRow({
          idTicket:   s.id,
          titulo:     s.titulo || '',
          entidad:    s.entidad?.nombre || '',
          estado:     s.estado === 'resuelto' ? 'Atendido' : 'Pendiente',
          numMensaje: index + 1,
          fecha:      msg.fechaCreacion ? new Date(msg.fechaCreacion).toLocaleString('es-CO') : '',
          autor:      msg.usuario?.nombre || '',
          rol:        rolLabel,
          contenido:  msg.texto || '',
        });

        // Mensajes de soporte/admin en azul claro para diferenciarse
        if (role === 'soporte' || role === 'admin') {
          row.getCell('contenido').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFeff6ff' } };
          row.getCell('rol').fill       = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFeff6ff' } };
          row.getCell('autor').fill     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFeff6ff' } };
          row.getCell('rol').font       = { color: { argb: 'FF1e40af' }, bold: true };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private async saveAdjuntos(
    files: Express.Multer.File[],
    mensajeId: number,
    soporteId: number,
  ): Promise<void> {
    const finalDir = path.join(
      process.cwd(),
      'uploads',
      'soportes',
      String(soporteId),
      String(mensajeId),
    );
    fs.mkdirSync(finalDir, { recursive: true });

    for (const file of files) {
      const ext = path.extname(file.originalname);
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const finalPath = path.join(finalDir, filename);

      // Mueve el archivo desde temp al destino final
      fs.renameSync(file.path, finalPath);

      const ruta = `soportes/${soporteId}/${mensajeId}/${filename}`;
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
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) return 'word';
    if (
      mime === 'application/vnd.ms-excel' ||
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) return 'excel';
    return 'otro';
  }

  private deleteFile(ruta: string): void {
    try {
      const filePath = path.join(process.cwd(), 'uploads', ...ruta.split('/'));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // No interrumpir el flujo si el archivo ya no existe
    }
  }
}
