import { useCallback, useState } from 'react';
import { Upload, FileAudio, X } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav'];

interface AudioUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  uploading: boolean;
}

export default function AudioUpload({ onFileSelect, selectedFile, onClear, uploading }: AudioUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const validateFile = (file: File): boolean => {
    setError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only WAV and MP3 files are accepted.');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be under 15MB.');
      return false;
    }
    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <FileAudio className="h-5 w-5 text-primary" />
        Upload Vocal Track
      </h3>

      {!selectedFile ? (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-surface-hover/30'
          }`}
        >
          <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="mb-1 text-sm font-medium">Drop your vocal track here</p>
          <p className="text-xs text-muted-foreground">WAV or MP3 · Max 15MB</p>
          <input
            type="file"
            accept=".wav,.mp3,audio/wav,audio/mpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <div className="flex items-center gap-3">
              <FileAudio className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </div>
            <button
              onClick={onClear}
              disabled={uploading}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <WaveformVisualizer audioFile={selectedFile} height={60} />
        </div>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
