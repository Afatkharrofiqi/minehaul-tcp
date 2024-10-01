import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('logs')
export class Log {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  method!: string;

  @Column({ type: 'varchar' })
  url!: string;

  @Column({ type: 'json', nullable: true })
  request_headers?: object;

  @Column({ type: 'json', nullable: true })
  request_body?: object;

  @Column({ type: 'json', nullable: true })
  response?: object;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;
}
