import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  accept?: Record<string, string[]>;
  label?: string;
  className?: string;
}

export function UploadDropzone({
  onFilesAccepted,
  accept = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
  },
  label = "Drop images here or click to upload",
  className,
}: UploadDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAccepted(acceptedFiles);
    },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        className
      )}
    >
      <input {...getInputProps()} />
      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        JPEG, PNG, WebP (max 20MB)
      </p>
    </div>
  );
}
