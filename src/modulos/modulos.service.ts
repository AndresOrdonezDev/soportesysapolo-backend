import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modulo } from './entities/modulo.entity';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';

@Injectable()
export class ModulosService {
  constructor(
    @InjectRepository(Modulo)
    private modulosRepository: Repository<Modulo>,
  ) {}

  async findAll(): Promise<Modulo[]> {
    return this.modulosRepository.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<Modulo> {
    const modulo = await this.modulosRepository.findOne({ where: { id } });
    if (!modulo) throw new NotFoundException('Módulo no encontrado');
    return modulo;
  }

  async create(dto: CreateModuloDto): Promise<Modulo> {
    const existing = await this.modulosRepository.findOne({
      where: { nombre: dto.nombre },
    });
    if (existing) throw new ConflictException('Ya existe un módulo con ese nombre');

    const modulo = this.modulosRepository.create({
      ...dto,
      estado: dto.estado ?? true,
    });
    return this.modulosRepository.save(modulo);
  }

  async update(id: number, dto: UpdateModuloDto): Promise<Modulo> {
    const modulo = await this.findOne(id);

    if (dto.nombre && dto.nombre !== modulo.nombre) {
      const existing = await this.modulosRepository.findOne({
        where: { nombre: dto.nombre },
      });
      if (existing) throw new ConflictException('Ya existe un módulo con ese nombre');
    }

    Object.assign(modulo, dto);
    return this.modulosRepository.save(modulo);
  }

  async remove(id: number): Promise<{ message: string }> {
    const modulo = await this.findOne(id);
    await this.modulosRepository.remove(modulo);
    return { message: 'Módulo eliminado' };
  }
}
