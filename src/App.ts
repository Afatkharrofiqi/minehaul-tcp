import express, { Application, Request, Response } from 'express';

import { AppConfig } from './configs/AppConfig';
import { Database } from './configs/Database';
import { ApiRouter } from './routes/ApiRouter';
import { TcpService } from './services/TcpService';

export class App {
  constructor(
    private readonly app: Application,
    private readonly apiRouter: ApiRouter,
    private readonly dataSource: Database,
    private readonly tcpService: TcpService
  ) {
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.connectToDatabase();
  }

  private initializeMiddlewares(): void {
    this.app.use(express.json());
  }

  private initializeRoutes(): void {
    this.app.get('/', this.handleRootRoute);
    this.app.use('/api', this.apiRouter.router);
  }

  private handleRootRoute(req: Request, res: Response): void {
    res.send('Welcome to the API Minehaul');
  }

  private async connectToDatabase(): Promise<void> {
    try {
      await this.dataSource.connect();
      console.log('Connected to the database successfully.');
    } catch (error) {
      console.error('Database connection failed:', error);
    }
  }

  public serveTcp(): void {
    this.tcpService.startServer();
  }

  public serve(): void {
    this.app.listen(AppConfig.port, () => {
      console.log(`Server is running on http://localhost:${AppConfig.port}`);
    });
  }
}
