import { DynamicModule, Module } from '@nestjs/common';
import { CryptocloudOptions } from '../types/public';
import { CRYPTOCLOUD_OPTIONS } from './CryptocloudConfig';
import { CryptocloudService } from './CryptocloudService';

@Module({})
export class CryptocloudModule {
  static register(options: CryptocloudOptions): DynamicModule {
    return {
      module: CryptocloudModule,
      providers: [
        { provide: CRYPTOCLOUD_OPTIONS, useValue: options },
        CryptocloudService
      ],
      exports: [CryptocloudService]
    };
  }
}


