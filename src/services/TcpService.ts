import { Server, Socket } from 'net';

import { TcpConfig } from '../configs/TcpConfig';
import { Logger } from '../utils/Logger';
import { SyncDeviceDataService } from './SyncDeviceDataService';

interface IOElement {
  n1IoId: number;
  ioValue: number;
}

interface Record {
  timestamp: bigint;
  priority: number;
  longitude: number;
  latitude: number;
  altitude: number;
  angle: number;
  satellites: number;
  speed: number;
  eventIoId: number;
  nTotalId: number;
  ioElements: IOElement[];
}

const hexToBuffer = (hex: string) => Buffer.from(hex, 'hex');

const parseAvlData = (hexStream: string) => {
  const buffer = hexToBuffer(hexStream);
  let offset = 0;

  const zeroBytes = buffer.slice(offset, offset + 4).toString('hex');
  offset += 4;

  const dataFieldLength = buffer.readUInt32BE(offset);
  offset += 4;

  const codecId = buffer.readUInt8(offset);
  offset += 1;

  const numberOfData1 = buffer.readUInt8(offset);
  offset += 1;

  const records = [];
  for (let i = 0; i < numberOfData1; i++) {
    const record: Record = {
      timestamp: BigInt(0),
      priority: 0,
      longitude: 0,
      latitude: 0,
      altitude: 0,
      angle: 0,
      satellites: 0,
      speed: 0,
      eventIoId: 0,
      nTotalId: 0,
      ioElements: [],
    };

    record.timestamp = buffer.readBigUInt64BE(offset);
    offset += 8;

    record.priority = buffer.readUInt8(offset);
    offset += 1;

    record.longitude = buffer.readInt32BE(offset);
    offset += 4;

    record.latitude = buffer.readInt32BE(offset);
    offset += 4;

    record.altitude = buffer.readInt16BE(offset);
    offset += 2;

    record.angle = buffer.readUInt16BE(offset);
    offset += 2;

    record.satellites = buffer.readUInt8(offset);
    offset += 1;

    record.speed = buffer.readUInt16BE(offset);
    offset += 2;

    record.eventIoId = buffer.readUInt8(offset);
    offset += 1;

    record.nTotalId = buffer.readUInt8(offset);
    offset += 1;

    record.ioElements = [];
    for (let j = 0; j < record.nTotalId; j++) {
      const ioElement: IOElement = {
        n1IoId: 0,
        ioValue: 0,
      };

      ioElement.n1IoId = buffer.readUInt8(offset);
      offset += 1;

      ioElement.ioValue = buffer.readUInt8(offset);
      offset += 1;

      record.ioElements.push(ioElement);
    }

    records.push(record);
  }

  const numberOfData2 = buffer.readUInt8(offset);
  offset += 1;

  const crc16 = buffer.slice(offset, offset + 4).toString('hex');
  offset += 4;

  return {
    zeroBytes,
    dataFieldLength,
    codecId,
    numberOfData1,
    records,
    numberOfData2,
    crc16,
  };
};

export class TcpService {
  private server: Server;

  constructor(private syncServiceData: SyncDeviceDataService) {
    this.server = new Server(this.handleConnection.bind(this));
  }

  private async handleConnection(socket: Socket): Promise<void> {
    Logger.log(
      `Client connected: ${socket.remoteAddress}:${socket.remotePort}`
    );

    let isImeiVerified = false;

    let dataBuffer: Buffer = Buffer.alloc(0);

    socket.on('data', async (data) => {
      Logger.log(`Received data: ${data.toString('hex')}`);

      if (!isImeiVerified) {
        const imei = data.toString('ascii').trim();
        Logger.log(`Received IMEI: ${imei} (Length: ${imei.length})`);

        if (/^\d{15}$/.test(imei) && imei.length === 15) {
          const imeiAck = Buffer.from('01', 'hex');
          socket.write(imeiAck);
          Logger.log('IMEI verified successfully');

          isImeiVerified = true;
        } else {
          Logger.log('Invalid IMEI received');
          socket.end();
        }
      } else {
        dataBuffer = Buffer.concat([dataBuffer, data]);

        try {
          if (dataBuffer.length >= 4) {
            const hexStream = dataBuffer.toString('hex');
            const parsedData = parseAvlData(hexStream);

            Logger.log(`Parsed Data: ${JSON.stringify(parsedData)}`);

            const receptionAck = Buffer.from('00000001', 'hex');
            socket.write(receptionAck);
            Logger.log('Data reception acknowledged');

            dataBuffer = Buffer.alloc(0);
          }
        } catch (error) {
          Logger.error(`Error parsing AVL data: ${error}`);
        }
      }
    });

    socket.on('end', () => {
      Logger.log('Client disconnected');
    });

    socket.on('error', (err) => {
      Logger.error(`Socket error: ${err.message}`);
    });
  }

  public startServer(): void {
    const { host, port } = TcpConfig;
    this.server.listen(port, host, () => {
      Logger.log(`TCP Server is running on ${host}:${port}`);
    });
  }
}
