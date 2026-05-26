import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CasoInternoMensaje } from './caso-interno-mensaje.entity';

export type AdjuntoTipo = 'image' | 'pdf' | 'word' | 'otro';

@Entity('caso_interno_adjuntos')
export class CasoInternoAdjunto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mensajeId: number;

  @ManyToOne(() => CasoInternoMensaje, (msg) => msg.adjuntos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mensajeId' })
  mensaje: CasoInternoMensaje;

  @Column({ length: 255 })
  nombre: string;

  @Column({ length: 20 })
  tipo: AdjuntoTipo;

  @Column({ length: 500 })
  ruta: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  tamanio: number;
}
