import type { DynamicFeatureFlags } from "@/lib/dynamic-feature-flags";
import { updateFeatureFlagAction } from "@/app/admin/actions";
import { Button } from "@/components/Button";

type ManageFeatureFlagsProps = {
  flags: DynamicFeatureFlags;
};

const FLAG_LABELS: Record<keyof DynamicFeatureFlags, string> = {
  map: "Map",
  submitPebble: "Submit a pebble",
  pebblePhotos: "Pebble photos",
};

/**
 * Admin-toggleable, DB-backed (AppSetting) — see docs/design.md's
 * "Dynamic feature flags" amendment for why these three moved off
 * NEXT_PUBLIC_* env vars (no redeploy needed to flip one, and they're
 * no longer inlined into the public JS bundle). FEATURE_ADMIN and
 * FEATURE_AUTH_GATE aren't here — both stay env-var-based, the latter
 * because it's read on the Edge runtime (proxy.ts), which can't reach
 * Postgres at all.
 */
export function ManageFeatureFlags({ flags }: ManageFeatureFlagsProps) {
  return (
    <ul className="flex flex-col gap-3">
      {(Object.keys(FLAG_LABELS) as (keyof DynamicFeatureFlags)[]).map((key) => {
        const enabled = flags[key];
        return (
          <li key={key} className="card flex items-center justify-between gap-4">
            <span>
              {FLAG_LABELS[key]} — <strong>{enabled ? "on" : "off"}</strong>
            </span>
            <form action={updateFeatureFlagAction.bind(null, key, enabled)}>
              <Button type="submit" variant="secondary">
                Turn {enabled ? "off" : "on"}
              </Button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
