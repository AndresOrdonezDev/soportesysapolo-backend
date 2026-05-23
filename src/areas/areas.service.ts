import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(Area)
    private areasRepository: Repository<Area>,
  ) {}

  async findAll(): Promise<Area[]> {
    return this.areasRepository.find({
      relations: ['entidad'],
      order: { entidadId: 'ASC', nombre: 'ASC' },
    });
  }

  async findByEntidad(entidadId: number): Promise<Area[]> {
    return this.areasRepository.find({
      where: { entidadId },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Area> {
    const area = await this.areasRepository.findOne({
      where: { id },
      relations: ['entidad'],
    });
    if (!area) throw new NotFoundException('Área no encontrada');
    return area;
  }

  async create(dto: CreateAreaDto): Promise<Area> {
    const existing = await this.areasRepository.findOne({
      where: { nombre: dto.nombre, entidadId: dto.entidadId },
    });
    if (existing)
      throw new ConflictException('Ya existe un área con ese nombre en esta entidad');

    const area = this.areasRepository.create(dto);
    return this.areasRepository.save(area);
  }

  async update(id: number, dto: UpdateAreaDto): Promise<Area> {
    const area = await this.findOne(id);

    const targetEntidadId = dto.entidadId ?? area.entidadId;
    const targetNombre = dto.nombre ?? area.nombre;

    if (dto.nombre || dto.entidadId) {
      const existing = await this.areasRepository.findOne({
        where: { nombre: targetNombre, entidadId: targetEntidadId },
      });
      if (existing && existing.id !== id)
        throw new ConflictException('Ya existe un área con ese nombre en esta entidad');
    }

    Object.assign(area, dto);
    return this.areasRepository.save(area);
  }

  async remove(id: number): Promise<{ message: string }> {
    const area = await this.findOne(id);
    await this.areasRepository.remove(area);
    return { message: 'Área eliminada' };
  }
}
