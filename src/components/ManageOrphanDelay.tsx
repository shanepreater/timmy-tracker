import { updateOrphanMinAgeMinutesAction } from "@/app/admin/actions";
import { Button } from "@/components/Button";

type ManageOrphanDelayProps = {
  minAgeMinutes: number;
};

/**
 * Admin-adjustable, DB-backed (AppSetting "ORPHANED_IMAGE_DELAY_MINS")
 * — how old a raw photo upload must be before the Orphaned photos tab
 * lists it. See pebble-photo-orphans.ts. Styled to match
 * ManageFeatureFlags' rows (same card, full width) since both live on
 * the Settings tab.
 */
export function ManageOrphanDelay({ minAgeMinutes }: ManageOrphanDelayProps) {
  return (
    <div className="card flex items-center justify-between gap-4">
      <span>Orphaned photo delay — {minAgeMinutes} min</span>
      <form action={updateOrphanMinAgeMinutesAction} className="flex items-center gap-2">
        <input
          type="number"
          name="minAgeMinutes"
          min={0}
          step={1}
          defaultValue={minAgeMinutes}
          aria-label="Orphaned photo delay (minutes)"
          className="input w-20"
        />
        <Button type="submit" variant="secondary">
          Update
        </Button>
      </form>
    </div>
  );
}
