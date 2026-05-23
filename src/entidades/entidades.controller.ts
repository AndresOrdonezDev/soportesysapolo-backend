import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { EntidadesService } from './entidades.service';
import { CreateEntidadDto } from './dto/create-entidad.dto';
import { UpdateEntidadDto } from './dto/update-entidad.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('entidades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class EntidadesController {
  constructor(private readonly entidadesService: EntidadesService) {}

  @Get()
  findAll() {
    return this.entidadesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.entidadesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateEntidadDto) {
    return this.entidadesService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEntidadDto,
  ) {
    return this.entidadesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.entidadesService.remove(id);
  }
}
