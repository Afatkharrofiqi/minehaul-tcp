import { DataSource, Repository } from 'typeorm';

import { SyncDeviceData } from '../models/SyncDeviceData';
import { DecodedPacket } from '../utils/Codec8EParser';

export class SyncDeviceDataService {
  private repo: Repository<SyncDeviceData>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(SyncDeviceData);
  }

  async insert(decodedData: DecodedPacket): Promise<SyncDeviceData> {
    // Create a new SyncDeviceData object using the parsed Codec 8E packet
    const syncDeviceData = this.repo.create({
      timestamp: decodedData.timestamp,
      priority: decodedData.priority,
      latitude: decodedData.gpsData.latitude,
      longitude: decodedData.gpsData.longitude,
      altitude: decodedData.gpsData.altitude,
      angle: decodedData.gpsData.angle,
      satellites: decodedData.gpsData.satellites,
      speed: decodedData.gpsData.speed,
      io_elements: decodedData.ioElements, // Save IO elements as a JSON object
    });

    return this.repo.save(syncDeviceData);
  }
}
