import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Entidad } from '../../entidades/entities/entidad.entity';
import { SoporteMensaje } from './soporte-mensaje.entity';

export enum SoporteEstado {
  PENDIENTE = 'pendiente',
  RESUELTO = 'resuelto',
}

@Entity('soportes')
export class Soporte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200, nullable: true })
  titulo: string;

  @Column({
    type: 'enum',
    enum: SoporteEstado,
    default: SoporteEstado.PENDIENTE,
  })
  estado: SoporteEstado;

  @CreateDateColumn()
  fechaSolicitud: Date;

  @Column()
  usuarioId: number;

  @ManyToOne(() => User, (user) => user.soportes, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column({ nullable: true })
  entidadId: number;

  @ManyToOne(() => Entidad, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'entidadId' })
  entidad: Entidad;

  @OneToMany(() => SoporteMensaje, (msg) => msg.soporte)
  mensajes: SoporteMensaje[];
}
