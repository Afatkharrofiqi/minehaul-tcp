import express, { Router } from 'express';

import { App } from './App';
import { Database } from './configs/Database';
import { TcpController } from './controllers/TcpController';
import { ApiRouter } from './routes/ApiRouter';
import { TcpRoute } from './routes/v1/TcpRoute';
import { TcpService } from './services/TcpService';

export class Bootstrap {
  public async init(): Promise<App> {
    const router = Router();
    const dataSource = new Database();
    const tcpService = new TcpService();

    const tcpController = new TcpController(tcpService);
    const tcpRoute = new TcpRoute(tcpController, router);

    const apiRouter = new ApiRouter(tcpRoute, router);

    const app = new App(express(), apiRouter, dataSource);

    return app;
  }

  public async start(): Promise<void> {
    const app = await this.init();
    app.serve();
    const tcpService = new TcpService();
    tcpService.startServer();
  }
}

const bootstrap = new Bootstrap();
bootstrap.start();
