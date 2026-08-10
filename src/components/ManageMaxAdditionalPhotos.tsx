import { updateMaxAdditionalPhotosAction } from "@/app/admin/actions";
import { Button } from "@/components/Button";

type ManageMaxAdditionalPhotosProps = {
  maxCount: number;
};

export function ManageMaxAdditionalPhotos({ maxCount }: ManageMaxAdditionalPhotosProps) {
  return (
    <div className="card flex items-center justify-between gap-4">
      <span>Max additional photos per pebble — {maxCount}</span>
      <form action={updateMaxAdditionalPhotosAction} className="flex items-center gap-2">
        <input
          type="number"
          name="maxCount"
          min={0}
          step={1}
          defaultValue={maxCount}
          aria-label="Max additional photos per pebble"
          className="input w-20"
        />
        <Button type="submit" variant="secondary">
          Update
        </Button>
      </form>
    </div>
  );
}
