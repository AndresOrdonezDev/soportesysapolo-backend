import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entidad } from './entities/entidad.entity';
import { CreateEntidadDto } from './dto/create-entidad.dto';
import { UpdateEntidadDto } from './dto/update-entidad.dto';

@Injectable()
export class EntidadesService {
  constructor(
    @InjectRepository(Entidad)
    private entidadesRepository: Repository<Entidad>,
  ) {}

  async findAll(): Promise<Entidad[]> {
    return this.entidadesRepository.find({
      relations: ['areas'],
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Entidad> {
    const entidad = await this.entidadesRepository.findOne({
      where: { id },
      relations: ['areas'],
    });
    if (!entidad) throw new NotFoundException('Entidad no encontrada');
    return entidad;
  }

  async create(dto: CreateEntidadDto): Promise<Entidad> {
    const existing = await this.entidadesRepository.findOne({
      where: { nombre: dto.nombre },
    });
    if (existing) throw new ConflictException('Ya existe una entidad con ese nombre');

    const entidad = this.entidadesRepository.create({
      ...dto,
      estado: dto.estado ?? true,
      correosNotificacion: dto.correosNotificacion ?? [],
      fechaVencimientoSoporte: dto.fechaVencimientoSoporte ?? null,
    });
    return this.entidadesRepository.save(entidad);
  }

  async update(id: number, dto: UpdateEntidadDto): Promise<Entidad> {
    const entidad = await this.findOne(id);

    if (dto.nombre && dto.nombre !== entidad.nombre) {
      const existing = await this.entidadesRepository.findOne({
        where: { nombre: dto.nombre },
      });
      if (existing) throw new ConflictException('Ya existe una entidad con ese nombre');
    }

    Object.assign(entidad, dto);
    return this.entidadesRepository.save(entidad);
  }

  async remove(id: number): Promise<{ message: string }> {
    const entidad = await this.findOne(id);
    await this.entidadesRepository.remove(entidad);
    return { message: 'Entidad eliminada' };
  }
}
