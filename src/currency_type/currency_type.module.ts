import { Module } from '@nestjs/common';
import { CurrencyTypeController } from './currency_type.controller';
import { CurrencytypeService } from './currency_type.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currencytype } from './currency_type.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Currencytype]),
        JwtModule.register({
          secret: jwtConstants.secret,
          signOptions: { expiresIn: '20h' },
        }),
      ],
      controllers: [CurrencyTypeController],
      providers: [CurrencytypeService, JwtStrategy]
})
export class CurrencyTypeModule {}
