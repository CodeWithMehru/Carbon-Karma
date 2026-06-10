'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileImage, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DragDropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function DragDropZone({ onFileSelected, disabled }: DragDropZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      onFileSelected(file);
    }
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    disabled,
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="w-full relative">
      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "rounded-xl transition-colors relative overflow-hidden h-64 border-2 border-dashed",
              isDragActive ? "border-emerald-500 bg-emerald-50/50" : "border-border hover:bg-emerald-50/30 hover:border-emerald-300",
              isDragReject && "border-red-500 bg-red-50/50",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
          >
            <div {...getRootProps()} className="w-full h-full flex flex-col items-center justify-center text-center cursor-pointer p-8 outline-none">
              <input {...getInputProps()} />
              
              <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                <UploadCloud className={cn("h-8 w-8 transition-colors", isDragActive ? "text-emerald-600" : "text-[#4a6a4a]")} />
              </div>
              
              <h3 className="text-lg font-semibold text-emerald-950 mb-1">
                {isDragActive ? "Drop receipt here" : "Click or drag receipt"}
              </h3>
              <p className="text-sm text-[#4a6a4a] mb-4 max-w-xs">
                Supports JPEG, PNG, and WebP. AI will automatically extract items.
              </p>

              <Button type="button" variant="outline" size="sm" className="bg-white pointer-events-none" disabled={disabled}>
                Select File
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-6 relative"
          >
            {previewUrl ? (
              <div className="relative w-32 h-40 rounded-lg overflow-hidden border border-border shadow-sm flex-shrink-0 bg-white">
                <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-32 h-40 rounded-lg bg-white border border-border flex items-center justify-center flex-shrink-0">
                <FileImage className="h-8 w-8 text-[#4a6a4a]" />
              </div>
            )}
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <ImageIcon className="h-4 w-4 text-emerald-600" />
                <h4 className="font-medium text-emerald-950 truncate max-w-[200px]">{selectedFile.name}</h4>
              </div>
              <p className="text-xs text-[#4a6a4a] mb-4">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              
              {!disabled && (
                <Button type="button" variant="outline" size="sm" onClick={removeFile} className="bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-[#4a6a4a]">
                  <X className="h-4 w-4 mr-1" /> Remove
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
