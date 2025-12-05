import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Role, User],
  synchronize: true, // Auto-create tables (disable in production)
  logging: false,
});
