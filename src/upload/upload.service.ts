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
          access_mode: 'public',
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

  async uploadTaskAttachment(file: Express.Multer.File): Promise<{ url: string; name: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type - allow images and common documents
    const allowedFormats = [
      'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'text/plain',
    ];

    if (!allowedFormats.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type: ${file.mimetype}. Only images and common document formats are allowed`);
    }

    // Validate file size (10MB max for attachments)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    return new Promise((resolve, reject) => {
      // For PDFs, we use 'image' resource type to allow inline browser viewing
      // For images, we use 'image'
      // For everything else, we use 'raw'
      let resourceType: 'image' | 'raw' | 'video' | 'auto' = 'raw';
      if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        resourceType = 'image';
      }

      // Construct a readable public_id: original_name_timestamp
      // Clean the filename: remove extension and special characters
      const originalName = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
      const extension = file.originalname.split('.').pop();
      const timestamp = Date.now();

      // For 'raw' resources, Cloudinary doesn't automatically add the extension to the URL 
      // unless it's part of the public_ID
      const publicId = resourceType === 'raw'
        ? `alinecrm/task-attachments/${originalName}_${timestamp}.${extension}`
        : `alinecrm/task-attachments/${originalName}_${timestamp}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: resourceType,
          access_mode: 'public',
          unique_filename: false,
          use_filename: true,
          transformation: file.mimetype.startsWith('image/') ? [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
          ] : undefined,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new BadRequestException('Failed to upload file to Cloudinary'));
          } else if (!result) {
            reject(new BadRequestException('Upload failed - no result returned'));
          } else {
            // For 'raw' resources, we return the secure_url which now includes the extension
            resolve({
              url: result.secure_url,
              name: file.originalname,
            });
          }
        }
      );

      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  }
}

