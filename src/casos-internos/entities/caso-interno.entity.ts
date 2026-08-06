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
import { Entidad } from '../../entidades/entities/entidad.entity';
import { CasoInternoMensaje } from './caso-interno-mensaje.entity';

export enum CasoInternoEstado {
  ABIERTO = 'abierto',
  CERRADO = 'cerrado',
}

export enum CasoInternoVisibilidad {
  TODOS = 'todos',
  INDIVIDUAL = 'individual',
}

export enum CasoInternoAlcance {
  TODAS = 'todas',
  RELACIONADA = 'relacionada',
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

  @Column({
    type: 'enum',
    enum: CasoInternoAlcance,
    default: CasoInternoAlcance.TODAS,
  })
  alcance: CasoInternoAlcance;

  @ManyToMany(() => Entidad, { eager: false })
  @JoinTable({
    name: 'caso_interno_entidades',
    joinColumn: { name: 'casoId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'entidadId', referencedColumnName: 'id' },
  })
  entidadesRelacionadas: Entidad[];

  @OneToMany(() => CasoInternoMensaje, (m) => m.caso)
  mensajes: CasoInternoMensaje[];
}
