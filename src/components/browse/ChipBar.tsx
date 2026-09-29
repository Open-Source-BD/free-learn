import * as ToggleGroup from '@radix-ui/react-toggle-group';
import LiquidGlass from '@/components/glass/LiquidGlass';
import { LANG_OPTIONS, type GridFilter } from '@/lib/filter';

interface Props {
  value: GridFilter;
  onChange(f: GridFilter): void;
}

export default function ChipBar({ value, onChange }: Props) {
  return (
    <div className="fixed top-[80px] left-1/2 z-30 w-max max-w-[calc(100vw-24px)] -translate-x-1/2 md:left-[calc(50%+34px)] md:max-w-[calc(100vw-120px)]">
      <LiquidGlass borderRadius={999} height="48px">
        <div className="flex h-full max-w-full items-center gap-1.5 overflow-x-auto">
          <ToggleGroup.Root
            type="single"
            value={value.lang}
            onValueChange={(v) => v && onChange({ ...value, lang: v as GridFilter['lang'] })}
            aria-label="Language"
            className="flex gap-1.5"
          >
            {LANG_OPTIONS.map((o) => (
              <ToggleGroup.Item key={o.value} value={o.value} className="chip">
                {o.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
          <span className="mx-1 h-5 w-px bg-white/25" aria-hidden="true" />
          <button
            type="button"
            className="chip"
            aria-pressed={value.type === 'playlist'}
            onClick={() => onChange({ ...value, type: value.type === 'playlist' ? 'all' : 'playlist' })}
          >
            Playlists
          </button>
        </div>
      </LiquidGlass>
    </div>
  );
}
