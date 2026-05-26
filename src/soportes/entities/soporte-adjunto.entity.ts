import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SoporteMensaje } from './soporte-mensaje.entity';

export type AdjuntoTipo = 'image' | 'pdf' | 'word' | 'excel' | 'otro';

@Entity('soporte_adjuntos')
export class SoporteAdjunto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mensajeId: number;

  @ManyToOne(() => SoporteMensaje, (msg) => msg.adjuntos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mensajeId' })
  mensaje: SoporteMensaje;

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
