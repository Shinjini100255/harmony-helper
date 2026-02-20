import { useEffect, useRef, useState } from 'react';

interface WaveformVisualizerProps {
  audioUrl?: string;
  audioFile?: File;
  height?: number;
  color?: string;
  bgColor?: string;
}

export default function WaveformVisualizer({
  audioUrl,
  audioFile,
  height = 80,
  color = 'hsl(174, 72%, 50%)',
  bgColor = 'hsl(220, 14%, 14%)',
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<number[]>([]);

  useEffect(() => {
    const loadAudio = async () => {
      try {
        const audioContext = new AudioContext();
        let arrayBuffer: ArrayBuffer;

        if (audioFile) {
          arrayBuffer = await audioFile.arrayBuffer();
        } else if (audioUrl) {
          const res = await fetch(audioUrl);
          arrayBuffer = await res.arrayBuffer();
        } else return;

        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const numBars = 100;
        const blockSize = Math.floor(channelData.length / numBars);
        const newPeaks: number[] = [];

        for (let i = 0; i < numBars; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j]);
          }
          newPeaks.push(sum / blockSize);
        }

        const max = Math.max(...newPeaks);
        setPeaks(newPeaks.map((p) => p / max));
        audioContext.close();
      } catch (err) {
        console.error('Failed to load audio for waveform:', err);
      }
    };

    loadAudio();
  }, [audioUrl, audioFile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    const barWidth = w / peaks.length;
    const gap = 1;

    peaks.forEach((peak, i) => {
      const barHeight = peak * h * 0.8;
      const x = i * barWidth;
      const y = (h - barHeight) / 2;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5 + peak * 0.5;
      ctx.beginPath();
      ctx.roundRect(x + gap / 2, y, barWidth - gap, barHeight, 1);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }, [peaks, color, bgColor]);

  if (peaks.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-waveform-bg"
        style={{ height }}
      >
        <div className="flex items-end gap-0.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-primary/20 animate-waveform-bar"
              style={{
                height: 12 + Math.random() * 24,
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg"
      style={{ height }}
    />
  );
}
