// src/services/TcpService.ts
import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';

export class TcpService {
  private server: Server;
  private config: TcpConfig;

  constructor() {
    this.server = new Server(this.handleConnection.bind(this));
    this.config = new TcpConfig();
  }

  private handleConnection(socket: Socket): void {
    console.log(
      `Client connected: ${socket.remoteAddress}:${socket.remotePort}`
    );

    // Listen for data from the client
    socket.on('data', (data) => {
      console.log(`Received data: ${data}`);
      // Echo back the data
      socket.write(`Echo: ${data}`);
    });

    // Handle client disconnection
    socket.on('end', () => {
      console.log('Client disconnected');
    });

    // Handle errors
    socket.on('error', (err) => {
      console.error(`Socket error: ${err}`);
    });
  }

  public startServer(): void {
    const { host, port } = this.config;
    this.server.listen(port, host, () => {
      console.log(`TCP Server is running on ${host}:${port}`);
    });
  }
}
