import * as ToggleGroup from '@radix-ui/react-toggle-group';
import LiquidGlass from '@/components/glass/LiquidGlass';
import { LANG_OPTIONS, type GridFilter } from '@/lib/filter';

interface Props {
  value: GridFilter;
  onChange(f: GridFilter): void;
}

export default function ChipBar({ value, onChange }: Props) {
  return (
    <div className="sticky top-[4.75rem] z-30 w-fit max-w-full">
      <LiquidGlass borderRadius={999}>
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto">
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
          <span className="mx-1 h-5 w-px bg-white/15" aria-hidden="true" />
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
