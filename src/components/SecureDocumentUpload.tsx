// Document metadata type for Supabase
interface Document {
  filename: string;
  mime_type: string;
  size: number;
  hash: string;
  encrypted_key: string;
  storage_path: string;
  metadata: {
    lastModified: number;
    type: string;
  };
}
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { getSupabaseClient } from '../utils/supabase/client';
import { validateDocument, encryptData, createDocumentVersion } from '../utils/supabase/dataProtection';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { UploadCloud, AlertCircle } from 'lucide-react';

interface SecureDocumentUploadProps {
  bucketId: string;
  filePath: string;
  onSuccess?: (fileUrl: string) => void;
  onError?: (error: Error) => void;
  maxSize?: number;
  allowedTypes?: string[];
}

export function SecureDocumentUpload({
  bucketId,
  filePath,
  onSuccess,
  onError,
  maxSize = 100 * 1024 * 1024, // 100MB default
  allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
}: SecureDocumentUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Validate document
      const isValid = await validateDocument(file);
      if (!isValid) {
        throw new Error('Document failed security validation');
      }

      // Generate encryption key
      const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
      const keyString = Array.from(encryptionKey)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Calculate file hash
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const supabase = getSupabaseClient();

      // Upload file with progress tracking
      const { error: uploadError } = await supabase.storage
        .from(bucketId)
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Store document metadata
      const document: Document = {
        filename: file.name,
        mime_type: file.type,
        size: file.size,
        hash: hashHex,
        encrypted_key: encryptData(keyString, 'YOUR_MASTER_KEY'), // Replace with secure key management
        storage_path: filePath,
        metadata: {
          lastModified: file.lastModified,
          type: file.type
        }
      };
      const { error: metadataError } = await supabase
        .from('documents')
        .insert([document] as any);

      if (metadataError) throw metadataError;

      // Create initial version
      await createDocumentVersion(bucketId, filePath, file);

      // Get download URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketId)
        .getPublicUrl(filePath);

      setUploadProgress(100);
      toast.success('Document uploaded securely');
      
      if (onSuccess) {
        onSuccess(publicUrl);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      if (onError) {
        onError(err instanceof Error ? err : new Error('Upload failed'));
      }
      toast.error('Document upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [bucketId, filePath, onSuccess, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    accept: allowedTypes && allowedTypes.length > 0 ? allowedTypes : undefined,
    multiple: false
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted'}
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-primary'}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center gap-4">
          <UploadCloud className="h-12 w-12 text-muted-foreground" />
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isDragActive ? 'Drop the file here' : 'Upload Document'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop your file here, or click to select
            </p>
          </div>

          <Button
            type="button"
            disabled={isUploading}
            variant="outline"
            className="mt-2"
          >
            Select File
          </Button>

          {/* File type info */}
          <div className="text-xs text-muted-foreground mt-2">
            Allowed types: PDF, Word, Excel, JPEG, PNG
          </div>
          
          {/* File size info */}
          <div className="text-xs text-muted-foreground">
            Maximum size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {isUploading && (
        <div className="mt-4 space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            Uploading... {uploadProgress.toFixed(0)}%
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}