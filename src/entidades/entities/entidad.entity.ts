import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Area } from '../../areas/entities/area.entity';

@Entity('entidades')
export class Entidad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ default: true })
  estado: boolean;

  @Column({ type: 'simple-json', nullable: true })
  correosNotificacion: string[];

  @Column({ type: 'date', nullable: true })
  fechaVencimientoSoporte: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Area, (area) => area.entidad)
  areas: Area[];
}
