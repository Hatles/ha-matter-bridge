import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor() {
  }

  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
