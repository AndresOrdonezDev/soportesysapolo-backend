import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Res,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as path from 'path';
import * as fs from 'fs';
import { CasosInternosService } from './casos-internos.service';
import { CreateCasoDto } from './dto/create-caso.dto';
import { CreateCasoMensajeDto } from './dto/create-caso-mensaje.dto';
import { UpdateCasoDto } from './dto/update-caso.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      fs.mkdirSync(tempDir, { recursive: true });
      cb(null, tempDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIMES.includes(file.mimetype));
  },
};

@Controller('casos-internos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'soporte')
export class CasosInternosController {
  constructor(private readonly casosService: CasosInternosService) {}

  @Get('equipo')
  findEquipo() {
    return this.casosService.findEquipo();
  }

  @Get('adjuntos/:id')
  async serveFile(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Res() res: Response,
  ) {
    const { filePath, adjunto } = await this.casosService.getAdjunto(id, req.user);
    res.setHeader('Content-Type', adjunto.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(adjunto.nombre)}"`,
    );
    fs.createReadStream(filePath).pipe(res);
  }

  @Get('adjuntos/:id/download')
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Res() res: Response,
  ) {
    const { filePath, adjunto } = await this.casosService.getAdjunto(id, req.user);
    res.setHeader('Content-Type', adjunto.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(adjunto.nombre)}"`,
    );
    fs.createReadStream(filePath).pipe(res);
  }

  @Get()
  findAll(@Request() req) {
    return this.casosService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.casosService.findOne(id, req.user);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('archivos', 10, multerConfig))
  create(
    @Body() dto: CreateCasoDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    return this.casosService.create(dto, files ?? [], req.user);
  }

  @Post(':id/mensajes')
  @UseInterceptors(FilesInterceptor('archivos', 10, multerConfig))
  addMensaje(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCasoMensajeDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    return this.casosService.addMensaje(id, dto, files ?? [], req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCasoDto,
    @Request() req,
  ) {
    return this.casosService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.casosService.remove(id, req.user);
  }
}
