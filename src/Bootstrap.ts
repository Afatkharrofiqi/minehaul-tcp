import express, { Router } from 'express';

import { App } from './App';
import { Database } from './configs/Database';
import { TcpController } from './controllers/TcpController';
import { ApiRouter } from './routes/ApiRouter';
import { TcpRoute } from './routes/v1/TcpRoute';
import { LogService } from './services/LogService';
import { TcpService } from './services/TcpService';

export class Bootstrap {
  public async init(): Promise<App> {
    const router = Router();
    const dataSource = new Database();
    const logService = new LogService(dataSource.getDataSource());
    const tcpService = new TcpService(logService);

    const tcpController = new TcpController(tcpService);

    const tcpRoute = new TcpRoute(tcpController, router);

    const apiRouter = new ApiRouter(tcpRoute, router);

    const app = new App(express(), apiRouter, dataSource, tcpService);

    return app;
  }

  public async start(): Promise<void> {
    const app = await this.init();
    app.serve();
    app.serveTcp();
  }
}

const bootstrap = new Bootstrap();
bootstrap.start();
