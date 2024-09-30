import { Router } from 'express';

import { TcpRoute } from './v1/TcpRoute';

export class ApiRouter {
  public router: Router;

  constructor(
    private tcpRoute: TcpRoute,
    router: Router
  ) {
    this.router = router;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.use('/tcp', this.tcpRoute.router);
  }
}
