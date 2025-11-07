import { getSupabaseClient } from './client';
import * as CryptoJS from 'crypto-js';

export interface EncryptionConfig {
  transit: {
    protocol: 'TLS';
    version: '1.3';
    ciphers: string[];
  };
  atRest: {
    algorithm: 'AES';
    keySize: 256;
    mode: 'GCM';
  };
  keyRotation: {
    interval: number;
    automatic: boolean;
  };
}

export interface DocumentSecurity {
  scanning: {
    malware: boolean;
    content: boolean;
    metadata: boolean;
  };
  storage: {
    encryption: boolean;
    versioning: boolean;
    retention: number;
  };
  access: {
    signedUrls: boolean;
    expiry: number;
    watermark: boolean;
  };
}

export const encryptionConfig: EncryptionConfig = {
  transit: {
    protocol: 'TLS',
    version: '1.3',
    ciphers: [
      'TLS_AES_128_GCM_SHA256',
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256'
    ]
  },
  atRest: {
    algorithm: 'AES',
    keySize: 256,
    mode: 'GCM'
  },
  keyRotation: {
    interval: 90 * 24 * 60 * 60 * 1000, // 90 days
    automatic: true
  }
};

export const documentSecurityConfig: DocumentSecurity = {
  scanning: {
    malware: true,
    content: true,
    metadata: true
  },
  storage: {
    encryption: true,
    versioning: true,
    retention: 365 // days
  },
  access: {
    signedUrls: true,
    expiry: 60, // minutes
    watermark: true
  }
};

// Encrypt sensitive data before storage
export const encryptData = (data: string, key: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7,
      keySize: 256/32
    });
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
};

// Decrypt data for use
export const decryptData = (encryptedData: string, key: string): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7,
      keySize: 256/32
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
};

// Generate a signed URL for secure document access
export const getSignedUrl = async (filePath: string, expiresIn: number = 3600): Promise<string> => {
  const supabase = getSupabaseClient();
  
  try {
    const { data: { signedUrl }, error } = await supabase
      .storage
      .from('documents')
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    
    return signedUrl;
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
    throw error;
  }
};

// Scan file for malware and validate content
export const validateDocument = async (file: File): Promise<boolean> => {
  // Implement virus scanning integration here
  const maxSize = 100 * 1024 * 1024; // 100MB
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ];

  if (file.size > maxSize) {
    throw new Error('File size exceeds maximum limit');
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }

  // Mock malware scan response
  const isSafe = true;
  
  return isSafe;
};

// Add watermark to PDF documents
export const addWatermark = async (file: File, text: string): Promise<Blob> => {
  // Implement PDF watermarking logic here
  // This is a placeholder - actual implementation would use a PDF library
  throw new Error('Watermarking not implemented');
};

// Handle document versioning
export const createDocumentVersion = async (
  bucketId: string,
  filePath: string,
  file: File
): Promise<void> => {
  const supabase = getSupabaseClient();
  
  try {
    // Store the new version
    const { error: uploadError } = await supabase
      .storage
      .from(bucketId)
      .upload(filePath, file, {
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Log version metadata
    const { error: logError } = await supabase
      .from('document_versions')
      .insert({
        file_path: filePath,
        version: new Date().toISOString(),
        size: file.size,
        type: file.type
      });

    if (logError) throw logError;
  } catch (error) {
    console.error('Version creation failed:', error);
    throw error;
  }
};