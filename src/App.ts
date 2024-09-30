import express, { Application } from 'express';

import { Database } from './configs/Database';
import { ApiRouter } from './routes/ApiRouter';

export class App {
  public app: Application;

  constructor(
    expressInstance: Application,
    private apiRouter: ApiRouter,
    private dataSource: Database
  ) {
    this.app = expressInstance;
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.connectToDatabase();
  }

  private initializeMiddlewares(): void {
    this.app.use(express.json());
  }

  private initializeRoutes(): void {
    this.app.use('/api', this.apiRouter.router);
  }

  private async connectToDatabase(): Promise<void> {
    try {
      await this.dataSource.connect();
      console.log('Connected to the database successfully.');
    } catch (error) {
      console.error('Database connection failed:', error);
    }
  }

  public serve(): void {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  }
}
