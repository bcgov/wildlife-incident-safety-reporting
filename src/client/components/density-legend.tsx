import { DENSITY_COLORS } from '@/lib/density-colors'

export function DensityLegend({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <span className="text-muted-foreground text-xs">Low</span>
      <div
        className="h-2.5 w-24 rounded-full"
        style={{
          background: `linear-gradient(to right, ${DENSITY_COLORS.join(', ')})`,
        }}
      />
      <span className="text-muted-foreground text-xs">High</span>
    </div>
  )
}
