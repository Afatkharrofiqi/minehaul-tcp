// src/configs/TcpConfig.ts
export class TcpConfig {
  public host: string;
  public port: number;

  constructor() {
    this.host = process.env.TCP_HOST || '127.0.0.1';
    this.port = Number(process.env.TCP_PORT) || 8080;
  }
}
