// src/services/TcpService.ts
import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';
import { SyncDeviceDataService } from './SyncDeviceDataService';

export class TcpService {
  private server: Server;
  private syncServiceData: SyncDeviceDataService;

  constructor(syncServiceData: SyncDeviceDataService) {
    this.server = new Server(this.handleConnection.bind(this));
    this.syncServiceData = syncServiceData;
  }

  private handleConnection(socket: Socket): void {
    console.log(
      `Client connected: ${socket.remoteAddress}:${socket.remotePort}`
    );

    // Listen for data from the client
    socket.on('data', async (data) => {
      console.log(`Received data: ${data}`);

      try {
        await this.syncServiceData.insert(data.toString());
        // Echo back the data
        socket.write(`Data logged successfully: ${data.toString()}`);
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
