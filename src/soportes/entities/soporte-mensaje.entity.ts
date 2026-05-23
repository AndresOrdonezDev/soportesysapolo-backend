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
import { SoporteAdjunto } from './soporte-adjunto.entity';
import { Soporte } from './soporte.entity';

@Entity('soporte_mensajes')
export class SoporteMensaje {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  soporteId: number;

  @ManyToOne(() => Soporte, (soporte) => soporte.mensajes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'soporteId' })
  soporte: Soporte;

  @Column()
  usuarioId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column({ type: 'text' })
  texto: string;

  @CreateDateColumn()
  fechaCreacion: Date;

  @OneToMany(() => SoporteAdjunto, (adj) => adj.mensaje, { cascade: true })
  adjuntos: SoporteAdjunto[];
}
