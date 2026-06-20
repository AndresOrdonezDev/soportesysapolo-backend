import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('modulos')
export class Modulo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150, unique: true })
  nombre: string;

  @Column({ default: true })
  estado: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
