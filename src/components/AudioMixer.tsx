import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';

interface Track {
  label: string;
  url: string;
  color: string;
}

interface AudioMixerProps {
  originalUrl: string;
  tracks: Track[];
  onDownload: () => void;
  downloading: boolean;
}

interface TrackState {
  gain: number;
  muted: boolean;
  buffer: AudioBuffer | null;
}

export default function AudioMixer({ originalUrl, tracks, onDownload, downloading }: AudioMixerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);

  const [playing, setPlaying] = useState(false);
  const [trackStates, setTrackStates] = useState<TrackState[]>([]);
  const [loading, setLoading] = useState(true);

  const allTracks = [
    { label: 'Original', url: originalUrl, color: 'hsl(174, 72%, 50%)' },
    ...tracks,
  ];

  // Load all audio buffers
  useEffect(() => {
    const loadBuffers = async () => {
      setLoading(true);
      try {
        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        const buffers = await Promise.all(
          allTracks.map(async (track) => {
            const res = await fetch(track.url);
            const arrayBuffer = await res.arrayBuffer();
            return ctx.decodeAudioData(arrayBuffer);
          })
        );

        setTrackStates(
          buffers.map((buffer) => ({ gain: 0.75, muted: false, buffer }))
        );
      } catch (err) {
        console.error('Failed to load audio:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBuffers();

    return () => {
      stopPlayback();
      audioContextRef.current?.close();
    };
  }, [originalUrl, tracks]);

  const stopPlayback = useCallback(() => {
    sourceNodesRef.current.forEach((node) => {
      try { node.stop(); } catch {}
    });
    sourceNodesRef.current = [];
    setPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || trackStates.length === 0) return;

    stopPlayback();

    const sources: AudioBufferSourceNode[] = [];
    const gains: GainNode[] = [];

    trackStates.forEach((ts) => {
      if (!ts.buffer) return;

      const source = ctx.createBufferSource();
      source.buffer = ts.buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = ts.muted ? 0 : ts.gain;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);

      sources.push(source);
      gains.push(gainNode);
    });

    sourceNodesRef.current = sources;
    gainNodesRef.current = gains;
    setPlaying(true);

    // Stop when the longest track ends
    const maxDuration = Math.max(
      ...trackStates.map((ts) => ts.buffer?.duration ?? 0)
    );
    setTimeout(() => {
      stopPlayback();
    }, maxDuration * 1000);
  }, [trackStates, stopPlayback]);

  const updateGain = (index: number, value: number) => {
    setTrackStates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], gain: value };
      return next;
    });
    if (gainNodesRef.current[index]) {
      gainNodesRef.current[index].gain.value = trackStates[index].muted ? 0 : value;
    }
  };

  const toggleMute = (index: number) => {
    setTrackStates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], muted: !next[index].muted };
      return next;
    });
    if (gainNodesRef.current[index]) {
      const newMuted = !trackStates[index].muted;
      gainNodesRef.current[index].gain.value = newMuted ? 0 : trackStates[index].gain;
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <h3 className="mb-4 text-lg font-semibold">Audio Mixer</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse-glow text-primary text-sm">Loading tracks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Audio Mixer</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={playing ? stopPlayback : startPlayback}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 glow-primary"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? 'Stop' : 'Play Mix'}
          </button>
          <button
            onClick={onDownload}
            disabled={downloading}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-surface-hover disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Rendering...' : 'Download'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {allTracks.map((track, i) => (
          <div
            key={track.label}
            className="flex items-center gap-3 rounded-lg bg-muted p-3"
          >
            <button
              onClick={() => toggleMute(i)}
              className="flex-shrink-0 rounded-md p-1.5 transition-colors hover:bg-surface-hover"
            >
              {trackStates[i]?.muted ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4" style={{ color: track.color }} />
              )}
            </button>

            <span
              className="w-24 flex-shrink-0 text-sm font-medium"
              style={{ color: track.color }}
            >
              {track.label}
            </span>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={trackStates[i]?.gain ?? 0.75}
              onChange={(e) => updateGain(i, parseFloat(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-border [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0"
              style={{
                // @ts-ignore
                '--tw-slider-color': track.color,
                background: `linear-gradient(to right, ${track.color} ${(trackStates[i]?.gain ?? 0.75) * 100}%, hsl(var(--border)) ${(trackStates[i]?.gain ?? 0.75) * 100}%)`,
              }}
            />

            <span className="w-10 text-right font-mono text-xs text-muted-foreground">
              {Math.round((trackStates[i]?.gain ?? 0.75) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
