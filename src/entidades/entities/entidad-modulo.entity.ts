import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Entidad } from './entidad.entity';
import { Modulo } from '../../modulos/entities/modulo.entity';

@Entity('entidad_modulo')
@Unique(['entidadId', 'moduloId'])
export class EntidadModulo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entidadId: number;

  @ManyToOne(() => Entidad, (entidad) => entidad.entidadModulos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entidadId' })
  entidad: Entidad;

  @Column()
  moduloId: number;

  @ManyToOne(() => Modulo, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moduloId' })
  modulo: Modulo;

  @CreateDateColumn()
  createdAt: Date;
}
