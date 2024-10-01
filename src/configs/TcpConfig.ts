export class TcpConfig {
  public static host: string = process.env.TCP_HOST || '127.0.0.1';
  public static port: number = Number(process.env.TCP_PORT) || 8080;

  public static getHost(): string {
    return this.host;
  }

  public static getPort(): number {
    return this.port;
  }
}
