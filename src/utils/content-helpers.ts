/**
 * Workers-compatible content helpers for FastMCP
 * These replace the Node.js file system dependent helpers from core FastMCP
 */

import { isCloudflareWorkers } from '../runtime/detection.js';
import { BufferPolyfill } from '../runtime/polyfills.js';

/**
 * Image content interface compatible with FastMCP
 */
export interface ImageContent {
  type: 'image';
  data: string; // base64 encoded
  mimeType: string;
}

/**
 * Audio content interface compatible with FastMCP
 */
export interface AudioContent {
  type: 'audio';
  data: string; // base64 encoded
  mimeType: string;
}

/**
 * Detect MIME type from file extension (fallback for Workers)
 */
function getMimeTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  
  const imageTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon'
  };

  const audioTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'm4a': 'audio/mp4',
    'flac': 'audio/flac'
  };

  return imageTypes[extension || ''] || audioTypes[extension || ''] || 'application/octet-stream';
}

/**
 * Detect MIME type from Response headers or URL
 */
function getMimeType(response: Response, url?: string): string {
  const contentType = response.headers.get('content-type');
  if (contentType) {
    return contentType.split(';')[0]!; // Remove charset info
  }
  
  if (url) {
    return getMimeTypeFromUrl(url);
  }
  
  return 'application/octet-stream';
}

/**
 * Convert Buffer/ArrayBuffer to base64 string
 */
function toBase64(data: ArrayBuffer | Buffer): string {
  if (isCloudflareWorkers()) {
    // Use Web APIs in Workers
    const uint8Array = new Uint8Array(data);
    const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  } else {
    // Use Node.js Buffer in Node environment
    if (Buffer.isBuffer(data)) {
      return data.toString('base64');
    } else {
      return Buffer.from(data).toString('base64');
    }
  }
}

/**
 * Workers-compatible image content helper
 * Supports URL and Buffer inputs (no file system access)
 */
export async function imageContent(
  input: { buffer: Buffer | ArrayBuffer } | { url: string }
): Promise<ImageContent> {
  let rawData: ArrayBuffer;
  let mimeType: string;

  try {
    if ('url' in input) {
      const response = await fetch(input.url);
      
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} - ${response.statusText}`
        );
      }

      rawData = await response.arrayBuffer();
      mimeType = getMimeType(response, input.url);
      
      // Validate it's actually an image MIME type
      if (!mimeType.startsWith('image/')) {
        const detectedType = getMimeTypeFromUrl(input.url);
        if (detectedType.startsWith('image/')) {
          mimeType = detectedType;
        } else {
          console.warn(`Warning: Content type '${mimeType}' may not be a valid image type`);
        }
      }
    } else if ('buffer' in input) {
      rawData = input.buffer instanceof ArrayBuffer ? input.buffer : input.buffer.buffer.slice(
        input.buffer.byteOffset,
        input.buffer.byteOffset + input.buffer.byteLength
      );
      
      // For buffers, we can't easily detect MIME type without file-type library
      // Default to a common image type or try to detect from first bytes
      mimeType = detectMimeTypeFromBytes(new Uint8Array(rawData)) || 'image/jpeg';
    } else {
      throw new Error('Invalid input: Provide either "url" or "buffer"');
    }

    const base64Data = toBase64(rawData);

    return {
      type: 'image',
      data: base64Data,
      mimeType,
    };
  } catch (error) {
    throw new Error(
      `Failed to process image content: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Workers-compatible audio content helper
 * Supports URL and Buffer inputs (no file system access)
 */
export async function audioContent(
  input: { buffer: Buffer | ArrayBuffer } | { url: string }
): Promise<AudioContent> {
  let rawData: ArrayBuffer;
  let mimeType: string;

  try {
    if ('url' in input) {
      const response = await fetch(input.url);
      
      if (!response.ok) {
        throw new Error(
          `Failed to fetch audio: ${response.status} - ${response.statusText}`
        );
      }

      rawData = await response.arrayBuffer();
      mimeType = getMimeType(response, input.url);
      
      // Validate it's actually an audio MIME type
      if (!mimeType.startsWith('audio/')) {
        const detectedType = getMimeTypeFromUrl(input.url);
        if (detectedType.startsWith('audio/')) {
          mimeType = detectedType;
        } else {
          console.warn(`Warning: Content type '${mimeType}' may not be a valid audio type`);
        }
      }
    } else if ('buffer' in input) {
      rawData = input.buffer instanceof ArrayBuffer ? input.buffer : input.buffer.buffer.slice(
        input.buffer.byteOffset,
        input.buffer.byteOffset + input.buffer.byteLength
      );
      
      // For buffers, we can't easily detect MIME type without file-type library
      // Default to a common audio type or try to detect from first bytes
      mimeType = detectAudioMimeTypeFromBytes(new Uint8Array(rawData)) || 'audio/mpeg';
    } else {
      throw new Error('Invalid input: Provide either "url" or "buffer"');
    }

    const base64Data = toBase64(rawData);

    return {
      type: 'audio',
      data: base64Data,
      mimeType,
    };
  } catch (error) {
    throw new Error(
      `Failed to process audio content: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Simple MIME type detection from file headers (magic bytes)
 * This is a basic implementation - for production use, consider a more robust solution
 */
function detectMimeTypeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }

  // GIF: 47 49 46 38 (GIF8)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif';
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes.length >= 12 && 
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return 'image/webp';
    }
  }

  return null;
}

/**
 * Simple audio MIME type detection from file headers
 */
function detectAudioMimeTypeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;

  // MP3: FF FB or FF F3 or FF F2
  if (bytes[0] === 0xFF && (bytes[1] === 0xFB || bytes[1] === 0xF3 || bytes[1] === 0xF2)) {
    return 'audio/mpeg';
  }

  // WAV: 52 49 46 46 ... 57 41 56 45
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes.length >= 12 && 
        bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
      return 'audio/wav';
    }
  }

  // OGG: 4F 67 67 53
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return 'audio/ogg';
  }

  return null;
}