import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardSidebar from '@/components/DashboardSidebar';
import AudioUpload from '@/components/AudioUpload';
import HarmonyControls from '@/components/HarmonyControls';
import AudioMixer from '@/components/AudioMixer';
import { Wand2, Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [credits, setCredits] = useState(3);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  // Harmony settings
  const [musicalKey, setMusicalKey] = useState('C');
  const [scale, setScale] = useState('major');
  const [intensity, setIntensity] = useState('medium');

  // Track data
  const [currentTrack, setCurrentTrack] = useState<{
    id: string;
    originalUrl: string;
    harmonyHighUrl?: string;
    harmonyMidUrl?: string;
    harmonyLowUrl?: string;
  } | null>(null);

  // Load user credits
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      if (data) setCredits(data.credits);
    };
    loadProfile();
  }, [user]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !user) return;
    setUploading(true);
    setError('');

    try {
      const ext = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get signed URL for playback
      const { data: urlData } = await supabase.storage
        .from('audio-files')
        .createSignedUrl(fileName, 3600);

      if (!urlData) throw new Error('Failed to get signed URL');

      // Save track record
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .insert({
          user_id: user.id,
          original_url: fileName,
        })
        .select()
        .single();

      if (trackError) throw trackError;

      setCurrentTrack({
        id: track.id,
        originalUrl: urlData.signedUrl,
      });
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [selectedFile, user]);

  const handleGenerate = useCallback(async () => {
    if (!currentTrack || !user || credits <= 0) return;
    setGenerating(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-harmonies', {
        body: {
          trackId: currentTrack.id,
          key: musicalKey,
          scale,
          intensity,
        },
      });

      if (error) throw error;

      // Refresh credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      if (profile) setCredits(profile.credits);

      // Get signed URLs for all harmony files
      const getUrl = async (path: string) => {
        const { data } = await supabase.storage
          .from('audio-files')
          .createSignedUrl(path, 3600);
        return data?.signedUrl ?? '';
      };

      setCurrentTrack((prev) => prev ? {
        ...prev,
        harmonyHighUrl: data.harmonyHighUrl,
        harmonyMidUrl: data.harmonyMidUrl,
        harmonyLowUrl: data.harmonyLowUrl,
      } : null);

      // Fetch signed URLs
      if (data.harmonyHighPath && data.harmonyMidPath && data.harmonyLowPath) {
        const [highUrl, midUrl, lowUrl] = await Promise.all([
          getUrl(data.harmonyHighPath),
          getUrl(data.harmonyMidPath),
          getUrl(data.harmonyLowPath),
        ]);

        setCurrentTrack((prev) => prev ? {
          ...prev,
          harmonyHighUrl: highUrl,
          harmonyMidUrl: midUrl,
          harmonyLowUrl: lowUrl,
        } : null);
      }
    } catch (err: any) {
      setError(err.message || 'Harmony generation failed');
    } finally {
      setGenerating(false);
    }
  }, [currentTrack, user, credits, musicalKey, scale, intensity]);

  const handleDownload = useCallback(async () => {
    if (!currentTrack) return;
    setDownloading(true);

    try {
      const urls = [
        currentTrack.originalUrl,
        currentTrack.harmonyHighUrl,
        currentTrack.harmonyMidUrl,
        currentTrack.harmonyLowUrl,
      ].filter(Boolean) as string[];

      const audioContext = new AudioContext();
      const buffers = await Promise.all(
        urls.map(async (url) => {
          const res = await fetch(url);
          const ab = await res.arrayBuffer();
          return audioContext.decodeAudioData(ab);
        })
      );

      const maxLength = Math.max(...buffers.map((b) => b.length));
      const sampleRate = buffers[0].sampleRate;

      const offlineCtx = new OfflineAudioContext(2, maxLength, sampleRate);

      buffers.forEach((buffer) => {
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        const gain = offlineCtx.createGain();
        gain.gain.value = 0.75;
        source.connect(gain);
        gain.connect(offlineCtx.destination);
        source.start(0);
      });

      const rendered = await offlineCtx.startRendering();

      // Convert to WAV
      const wavBlob = audioBufferToWav(rendered);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'harmonized-mix.wav';
      a.click();
      URL.revokeObjectURL(url);
      audioContext.close();
    } catch (err: any) {
      setError('Download failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  }, [currentTrack]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const hasHarmonies = !!(
    currentTrack?.harmonyHighUrl &&
    currentTrack?.harmonyMidUrl &&
    currentTrack?.harmonyLowUrl
  );

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar credits={credits} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Vocal Harmonizer</h1>
            <p className="text-sm text-muted-foreground">
              Upload a vocal track, generate AI harmonies, and mix them together.
            </p>
          </div>

          <div className="space-y-6">
            {/* Upload */}
            <AudioUpload
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              onClear={() => {
                setSelectedFile(null);
                setCurrentTrack(null);
              }}
              uploading={uploading}
            />

            {/* Upload button */}
            {selectedFile && !currentTrack && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50 glow-primary"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Track'
                )}
              </button>
            )}

            {/* Harmony Controls */}
            {currentTrack && !hasHarmonies && (
              <>
                <HarmonyControls
                  musicalKey={musicalKey}
                  scale={scale}
                  intensity={intensity}
                  onKeyChange={setMusicalKey}
                  onScaleChange={setScale}
                  onIntensityChange={setIntensity}
                  disabled={generating}
                />

                <button
                  onClick={handleGenerate}
                  disabled={generating || credits <= 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50 glow-primary"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating Harmonies...
                    </>
                  ) : credits <= 0 ? (
                    'Out of Credits'
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Generate Harmonies (1 credit)
                    </>
                  )}
                </button>
              </>
            )}

            {/* Mixer */}
            {hasHarmonies && currentTrack && (
              <AudioMixer
                originalUrl={currentTrack.originalUrl}
                tracks={[
                  { label: 'High Harmony', url: currentTrack.harmonyHighUrl!, color: 'hsl(340, 75%, 55%)' },
                  { label: 'Mid Harmony', url: currentTrack.harmonyMidUrl!, color: 'hsl(45, 85%, 55%)' },
                  { label: 'Low Harmony', url: currentTrack.harmonyLowUrl!, color: 'hsl(200, 75%, 55%)' },
                ]}
                onDownload={handleDownload}
                downloading={downloading}
              />
            )}

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// WAV encoding helper
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export default Dashboard;
