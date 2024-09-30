import { DataSource } from 'typeorm';

export class Database {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'user',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'mydb',
      synchronize: true,
      logging: false,
      entities: [],
    });
  }

  public async connect(): Promise<void> {
    await this.dataSource.initialize();
  }

  public getDataSource(): DataSource {
    return this.dataSource;
  }
}
