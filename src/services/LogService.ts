import { DataSource, Repository } from 'typeorm';

import { TcpConfig } from '../configs/TcpConfig';
import { Log } from '../models/Log';

export class LogService {
  private logRepository: Repository<Log>;

  constructor(private dataSource: DataSource) {
    this.logRepository = this.dataSource.getRepository(Log);
  }

  async logTcpData(data: string): Promise<Log> {
    const log = this.logRepository.create({
      method: 'TCP',
      url: TcpConfig.host,
      request_body: { data },
    });

    return this.logRepository.save(log);
  }
}
