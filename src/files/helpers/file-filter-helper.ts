import { Request } from 'express';

export const fileFilter = (request: Request, file: Express.Multer.File, callback: Function) => {
  if (!file) return callback(new Error('File is empty'), false);

  const fileType = file.mimetype.split('/')[1];
  const types = ['jpg', 'jpeg', 'png', 'gif'];

  if (types.includes(fileType)) return callback(null, true);

  callback(null, false);
};
