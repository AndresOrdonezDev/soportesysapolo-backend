import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entidad } from '../../entidades/entities/entidad.entity';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column()
  entidadId: number;

  @ManyToOne(() => Entidad, (entidad) => entidad.areas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entidadId' })
  entidad: Entidad;

  @CreateDateColumn()
  createdAt: Date;
}
