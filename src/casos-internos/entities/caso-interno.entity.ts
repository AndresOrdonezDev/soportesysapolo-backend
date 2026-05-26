import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CasoInternoMensaje } from './caso-interno-mensaje.entity';

export enum CasoInternoEstado {
  ABIERTO = 'abierto',
  CERRADO = 'cerrado',
}

export enum CasoInternoVisibilidad {
  TODOS = 'todos',
  INDIVIDUAL = 'individual',
}

@Entity('casos_internos')
export class CasoInterno {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  titulo: string;

  @Column({
    type: 'enum',
    enum: CasoInternoEstado,
    default: CasoInternoEstado.ABIERTO,
  })
  estado: CasoInternoEstado;

  @CreateDateColumn()
  fechaCreacion: Date;

  @Column()
  creadoPorId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: User;

  @Column({
    type: 'enum',
    enum: CasoInternoVisibilidad,
    default: CasoInternoVisibilidad.TODOS,
  })
  visibilidad: CasoInternoVisibilidad;

  @ManyToMany(() => User, { eager: false })
  @JoinTable({
    name: 'caso_interno_asignaciones',
    joinColumn: { name: 'casoId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'usuarioId', referencedColumnName: 'id' },
  })
  asignadoA: User[];

  @OneToMany(() => CasoInternoMensaje, (m) => m.caso)
  mensajes: CasoInternoMensaje[];
}
