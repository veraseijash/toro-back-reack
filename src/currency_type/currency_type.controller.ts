import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtUserGuard } from 'src/users/jwt-user.guard';
import { CurrencytypeService } from './currency_type.service';
import { CreateCurrencytypeDto } from './dto/create-currencytype.dto';
import { UpdateCurrencytypeDto } from './dto/update-currencytype.dto';

@Controller('currency-type')
export class CurrencyTypeController {
  constructor(private currencytypeService: CurrencytypeService) {}

  @UseGuards(JwtUserGuard)
  @Get()
  getListCurrencytype() {
    return this.currencytypeService.getListCurrencytype();
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getCurrencytype(@Param('id', ParseIntPipe) id: number) {
    return this.currencytypeService.getCurrencytype(id);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateCurrencytype(
    @Param('id', ParseIntPipe) id: number,
    @Body() currencytype: UpdateCurrencytypeDto,
  ) {
    return this.currencytypeService.updateCurrencytype(id, currencytype);
  }

  @UseGuards(JwtUserGuard)
  @Post()
  createCurrencytype(@Body() newCurrency: CreateCurrencytypeDto) {
    return this.currencytypeService.createCurrencytype(newCurrency);
  }

}