export class AppConfig {
  public static nodeEnv: string = process.env.NODE_ENV || 'development';
  public static port: number = Number(process.env.PORT) || 3000;
}
