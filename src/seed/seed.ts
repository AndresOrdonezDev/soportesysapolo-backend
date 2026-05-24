import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';
import { UsuarioScope } from '../users/entities/usuario-scope.entity';
import { Soporte } from '../soportes/entities/soporte.entity';
import { SoporteMensaje } from '../soportes/entities/soporte-mensaje.entity';
import { SoporteAdjunto } from '../soportes/entities/soporte-adjunto.entity';
import { Entidad } from '../entidades/entities/entidad.entity';
import { Area } from '../areas/entities/area.entity';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'root',
  database: process.env.DB_NAME || 'soportesysapolo',
  entities: [User, UsuarioScope, Soporte, SoporteMensaje, SoporteAdjunto, Entidad, Area],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('Conexión establecida...');

  const userRepo = AppDataSource.getRepository(User);

  const existing = await userRepo.findOne({ where: { alias: 'admin' } });
  if (existing) {
    console.log('El usuario admin ya existe. No se creará uno nuevo.');
    await AppDataSource.destroy();
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = userRepo.create({
    nombre: 'Super Administrador',
    alias: 'admin',
    password: hashedPassword,
    role: UserRole.ADMIN,
    activo: true,
  });

  await userRepo.save(admin);
  console.log('Usuario super admin creado:');
  console.log('  Alias: admin');
  console.log('  Contraseña: admin123');
  console.log('  Rol: admin');

  await AppDataSource.destroy();
  console.log('Seed completado.');
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
