export function toPebblePhotoDisplayUrl(url: string): string {
  return `/api/pebble-photo?url=${encodeURIComponent(url)}`;
}
