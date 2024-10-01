import * as dotenv from 'dotenv';
dotenv.config();

export class DatabaseConfig {
  public static readonly type: 'postgres' =
    (process.env.DB_TYPE as 'postgres') || 'postgres';
  public static readonly host: string = process.env.DB_HOST || 'localhost';
  public static readonly port: number = Number(process.env.DB_PORT) || 5432;
  public static readonly username: string =
    process.env.DB_USERNAME || 'default_user';
  public static readonly password: string =
    String(process.env.DB_PASSWORD) || 'default_password';
  public static readonly database: string = process.env.DB_NAME || 'default_db';
  public static readonly synchronize: boolean =
    process.env.DB_SYNCHRONIZE === 'true'; // Ensure this is false in production
}
