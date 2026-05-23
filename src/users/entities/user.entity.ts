import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Soporte } from '../../soportes/entities/soporte.entity';
import { UsuarioScope } from './usuario-scope.entity';

export enum UserRole {
  ADMIN = 'admin',
  SOPORTE = 'soporte',
  USER = 'user',
}

export enum UserArea {
  CONTABILIDAD = 'Contabilidad',
  PRESUPUESTO = 'Presupuesto',
  DESPACHO = 'Despacho',
  TESORERIA = 'Tesorería',
  RENTAS = 'Rentas',
  PENSIONES = 'Pensiones',
  GENERAL = 'General',
  OTRA = 'Otra',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 50, unique: true })
  alias: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserArea,
    default: UserArea.GENERAL,
  })
  area: UserArea;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Soporte, (soporte) => soporte.usuario)
  soportes: Soporte[];

  @OneToMany(() => UsuarioScope, (scope) => scope.usuario)
  scope: UsuarioScope[];
}
