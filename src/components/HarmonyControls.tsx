import { Settings2 } from 'lucide-react';

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALES = ['Major', 'Minor'];
const INTENSITIES = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
];

interface HarmonyControlsProps {
  musicalKey: string;
  scale: string;
  intensity: string;
  onKeyChange: (key: string) => void;
  onScaleChange: (scale: string) => void;
  onIntensityChange: (intensity: string) => void;
  disabled: boolean;
}

export default function HarmonyControls({
  musicalKey,
  scale,
  intensity,
  onKeyChange,
  onScaleChange,
  onIntensityChange,
  disabled,
}: HarmonyControlsProps) {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Settings2 className="h-5 w-5 text-primary" />
        Harmony Settings
      </h3>

      <div className="space-y-4">
        {/* Key */}
        <div>
          <label className="mb-1.5 block text-sm text-muted-foreground">Key</label>
          <select
            value={musicalKey}
            onChange={(e) => onKeyChange(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            {KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        {/* Scale */}
        <div>
          <label className="mb-1.5 block text-sm text-muted-foreground">Scale</label>
          <div className="grid grid-cols-2 gap-2">
            {SCALES.map((s) => (
              <button
                key={s}
                onClick={() => onScaleChange(s.toLowerCase())}
                disabled={disabled}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                  scale === s.toLowerCase()
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground hover:border-primary/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity */}
        <div>
          <label className="mb-1.5 block text-sm text-muted-foreground">Intensity</label>
          <div className="grid grid-cols-3 gap-2">
            {INTENSITIES.map((i) => (
              <button
                key={i.value}
                onClick={() => onIntensityChange(i.value)}
                disabled={disabled}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                  intensity === i.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground hover:border-primary/50'
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
