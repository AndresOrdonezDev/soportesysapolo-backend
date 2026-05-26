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
import { CasoInterno } from './caso-interno.entity';
import { CasoInternoAdjunto } from './caso-interno-adjunto.entity';

@Entity('caso_interno_mensajes')
export class CasoInternoMensaje {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  casoId: number;

  @ManyToOne(() => CasoInterno, (caso) => caso.mensajes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'casoId' })
  caso: CasoInterno;

  @Column()
  usuarioId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column({ type: 'text' })
  texto: string;

  @CreateDateColumn()
  fechaCreacion: Date;

  @OneToMany(() => CasoInternoAdjunto, (adj) => adj.mensaje, { cascade: true })
  adjuntos: CasoInternoAdjunto[];
}
