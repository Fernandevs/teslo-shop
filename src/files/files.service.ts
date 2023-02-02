import { join } from 'path';
import { existsSync } from 'fs';

import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class FilesService {
  getStaticProductImage (image: string) {
    const path = join(__dirname, '../../static/products', image);

    if (!existsSync(path)) throw new BadRequestException(`No product with image ${ image } found`);

    return path;
  }
}
