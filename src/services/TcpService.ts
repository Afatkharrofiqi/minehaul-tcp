// src/services/TcpService.ts
import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';
import { LogService } from './LogService';

export class TcpService {
  private server: Server;
  private logService: LogService;

  constructor(logService: LogService) {
    this.server = new Server(this.handleConnection.bind(this));
    this.logService = logService;
  }

  private handleConnection(socket: Socket): void {
    console.log(
      `Client connected: ${socket.remoteAddress}:${socket.remotePort}`
    );

    // Listen for data from the client
    socket.on('data', async (data) => {
      console.log(`Received data: ${data}`);

      // Save the data to logs using LogService
      try {
        const cleanString = data.toString().replace(/\r\n/g, '');
        await this.logService.logTcpData(cleanString);
        // Echo back the data
        socket.write(`Data logged successfully: ${cleanString}`);
        console.log('Data logged successfully.');
      } catch (error) {
        socket.write(`Failed to log data.`);
        console.error('Failed to log data:', error);
      }
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
    const { host, port } = TcpConfig;
    this.server.listen(port, host, () => {
      console.log(`TCP Server is running on ${host}:${port}`);
    });
  }
}
