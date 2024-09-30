import { Router } from 'express';

import { TcpController } from '../../controllers/TcpController';

export class TcpRoute {
  public router: Router;

  constructor(
    private tcpController: TcpController,
    router: Router
  ) {
    this.router = router;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // You can define TCP-related HTTP routes here if needed.
    this.router.get('/start', (req, res) => {
      this.tcpController.startTcpServer();
      res.json({ message: 'TCP Server started' });
    });
  }
}
