import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadProfilePicture(file: Express.Multer.File): Promise<string> {
    if (!file) {
      console.error('Upload failed: No file provided');
      throw new BadRequestException('No file provided');
    }

    console.log('Uploading file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Validate file type
    const allowedFormats = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedFormats.includes(file.mimetype)) {
      console.error('Upload failed: Invalid mimetype', file.mimetype);
      throw new BadRequestException(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP are allowed`);
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('Upload failed: File too large', file.size);
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'alinecrm/profile-pictures',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ],
          allowed_formats: ['jpg', 'png', 'webp'],
        },
        (error, result) => {
          if (error) {
            reject(new BadRequestException('Failed to upload image to Cloudinary'));
          } else if (!result) {
            reject(new BadRequestException('Upload failed - no result returned'));
          } else {
            resolve(result.secure_url);
          }
        }
      );

      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  }

  async deleteProfilePicture(imageUrl: string): Promise<void> {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      return;
    }

    try {
      // Extract public_id from URL
      const parts = imageUrl.split('/');
      const filename = parts[parts.length - 1].split('.')[0];
      const folder = 'alinecrm/profile-pictures';
      const publicId = `${folder}/${filename}`;

      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      // Silently fail - image might already be deleted or not exist
      console.error('Failed to delete image from Cloudinary:', error);
    }
  }
}
