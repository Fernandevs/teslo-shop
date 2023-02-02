import { Request } from 'express';
import { v4 as uuid } from 'uuid';

export const filename = (request: Request, file: Express.Multer.File, callback: Function) => {
  if (!file) return callback(new Error('File is empty'), false);

  const fileType = file.mimetype.split('/')[1];
  const fileName = `${ uuid() }.${ fileType }`;

  callback(null, fileName);
};
