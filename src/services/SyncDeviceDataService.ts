import { DataSource, Repository } from 'typeorm';

import { SyncDeviceData } from '../models/SyncDeviceData';

export class SyncDeviceDataService {
  private repo: Repository<SyncDeviceData>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(SyncDeviceData);
  }

  async insert(data: Buffer): Promise<SyncDeviceData> {
    const syncDeviceData = this.repo.create({
      data,
    });

    return this.repo.save(syncDeviceData);
  }
}
