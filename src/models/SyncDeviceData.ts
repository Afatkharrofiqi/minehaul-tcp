import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sync_device_data')
export class SyncDeviceData {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'timestamp' })
  timestamp!: Date;

  @Column({ type: 'int' })
  priority!: number;

  @Column({ type: 'float', nullable: true })
  latitude!: number;

  @Column({ type: 'float', nullable: true })
  longitude!: number;

  @Column({ type: 'int', nullable: true })
  altitude!: number;

  @Column({ type: 'int', nullable: true })
  angle!: number;

  @Column({ type: 'int', nullable: true })
  satellites!: number;

  @Column({ type: 'int', nullable: true })
  speed!: number;

  @Column({ type: 'jsonb', nullable: true })
  io_elements!: Record<number, number>;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;
}
