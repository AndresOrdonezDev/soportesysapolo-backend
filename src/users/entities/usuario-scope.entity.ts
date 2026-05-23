import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Entidad } from '../../entidades/entities/entidad.entity';
import { Area } from '../../areas/entities/area.entity';

@Entity('usuario_scope')
export class UsuarioScope {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @ManyToOne(() => User, (user) => user.scope, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column()
  entidadId: number;

  @ManyToOne(() => Entidad, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entidadId' })
  entidad: Entidad;

  @Column({ nullable: true })
  areaId: number | null;

  @ManyToOne(() => Area, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'areaId' })
  area: Area | null;
}
