import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Entidad } from './entities/entidad.entity';
import { EntidadModulo } from './entities/entidad-modulo.entity';
import { CreateEntidadDto } from './dto/create-entidad.dto';
import { UpdateEntidadDto } from './dto/update-entidad.dto';

@Injectable()
export class EntidadesService {
  constructor(
    @InjectRepository(Entidad)
    private entidadesRepository: Repository<Entidad>,
    @InjectRepository(EntidadModulo)
    private entidadModuloRepository: Repository<EntidadModulo>,
  ) {}

  private toResponse(entidad: Entidad): Entidad & { modulos: any[] } {
    const { entidadModulos, ...rest } = entidad;
    return {
      ...(rest as Entidad),
      modulos: (entidadModulos ?? []).map((em) => em.modulo),
    };
  }

  private buildFindQuery(moduloIds?: number[]) {
    const qb = this.entidadesRepository
      .createQueryBuilder('entidad')
      .leftJoinAndSelect('entidad.entidadModulos', 'em')
      .leftJoinAndSelect('em.modulo', 'modulo')
      .orderBy('entidad.nombre', 'ASC');

    if (moduloIds?.length) {
      qb.andWhere((subQb) => {
        const subQuery = subQb
          .subQuery()
          .select('em2.entidadId')
          .from(EntidadModulo, 'em2')
          .where('em2.moduloId IN (:...moduloIds)')
          .getQuery();
        return `entidad.id IN ${subQuery}`;
      }, { moduloIds });
    }

    return qb;
  }

  async findAll(moduloIds?: number[]): Promise<(Entidad & { modulos: any[] })[]> {
    const entidades = await this.buildFindQuery(moduloIds).getMany();
    return entidades.map((e) => this.toResponse(e));
  }

  async findOne(id: number): Promise<Entidad & { modulos: any[] }> {
    const entidad = await this.entidadesRepository.findOne({
      where: { id },
      relations: ['entidadModulos', 'entidadModulos.modulo'],
    });
    if (!entidad) throw new NotFoundException('Entidad no encontrada');
    return this.toResponse(entidad);
  }

  private async syncModulos(entidadId: number, moduloIds?: number[]): Promise<void> {
    if (moduloIds === undefined) return;
    await this.entidadModuloRepository.delete({ entidadId });
    if (moduloIds.length) {
      const entries = moduloIds.map((moduloId) =>
        this.entidadModuloRepository.create({ entidadId, moduloId }),
      );
      await this.entidadModuloRepository.save(entries);
    }
  }

  async create(dto: CreateEntidadDto): Promise<Entidad & { modulos: any[] }> {
    const existing = await this.entidadesRepository.findOne({
      where: { nombre: dto.nombre },
    });
    if (existing) throw new ConflictException('Ya existe una entidad con ese nombre');

    const { moduloIds, ...rest } = dto;
    const entidad = this.entidadesRepository.create({
      ...rest,
      estado: dto.estado ?? true,
      correosNotificacion: dto.correosNotificacion ?? [],
      fechaVencimientoSoporte: dto.fechaVencimientoSoporte ?? null,
    });
    const saved = await this.entidadesRepository.save(entidad);
    await this.syncModulos(saved.id, moduloIds);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateEntidadDto): Promise<Entidad & { modulos: any[] }> {
    const entidad = await this.entidadesRepository.findOne({ where: { id } });
    if (!entidad) throw new NotFoundException('Entidad no encontrada');

    if (dto.nombre && dto.nombre !== entidad.nombre) {
      const existing = await this.entidadesRepository.findOne({
        where: { nombre: dto.nombre },
      });
      if (existing) throw new ConflictException('Ya existe una entidad con ese nombre');
    }

    const { moduloIds, ...rest } = dto;
    Object.assign(entidad, rest);
    await this.entidadesRepository.save(entidad);
    await this.syncModulos(id, moduloIds);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const entidad = await this.entidadesRepository.findOne({ where: { id } });
    if (!entidad) throw new NotFoundException('Entidad no encontrada');
    await this.entidadesRepository.remove(entidad);
    return { message: 'Entidad eliminada' };
  }

  // ── exportToExcel ─────────────────────────────────────────────────────────

  async exportToExcel(moduloIds: number[] | null): Promise<Buffer> {
    const entidades = await this.buildFindQuery(moduloIds ?? undefined).getMany();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Software y Soluciones';
    workbook.created = new Date();

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } };

    const sheet = workbook.addWorksheet('Entidades');
    sheet.columns = [
      { header: 'ID',                       key: 'id',              width: 8  },
      { header: 'Nombre',                   key: 'nombre',          width: 35 },
      { header: 'Estado',                   key: 'estado',          width: 12 },
      { header: 'Módulos contratados',      key: 'modulos',         width: 45 },
      { header: 'Correos de notificación',  key: 'correos',         width: 40 },
      { header: 'Vencimiento soporte',      key: 'vencimiento',     width: 20 },
    ];

    sheet.getRow(1).fill = headerFill;
    sheet.getRow(1).font = headerFont;
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 20;
    sheet.getColumn('modulos').alignment = { wrapText: true, vertical: 'top' };

    entidades.forEach((e) => {
      const modulos = (e.entidadModulos ?? []).map((em) => em.modulo?.nombre).filter(Boolean);
      const row = sheet.addRow({
        id:          e.id,
        nombre:      e.nombre,
        estado:      e.estado ? 'Activa' : 'Inactiva',
        modulos:     modulos.join(', ') || '—',
        correos:     (e.correosNotificacion ?? []).join(', ') || '—',
        vencimiento: e.fechaVencimientoSoporte
          ? new Date(e.fechaVencimientoSoporte).toLocaleDateString('es-CO')
          : '—',
      });

      const estadoCell = row.getCell('estado');
      if (e.estado) {
        estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdcfce7' } };
        estadoCell.font = { color: { argb: 'FF166534' }, bold: true };
      } else {
        estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfee2e2' } };
        estadoCell.font = { color: { argb: 'FF991b1b' }, bold: true };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
