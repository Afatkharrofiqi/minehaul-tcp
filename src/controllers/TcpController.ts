import { TcpService } from '../services/TcpService';

export class TcpController {
  private tcpService: TcpService;

  constructor(tcpService: TcpService) {
    this.tcpService = tcpService;
  }

  public startTcpServer(): void {
    this.tcpService.startServer();
  }
}
