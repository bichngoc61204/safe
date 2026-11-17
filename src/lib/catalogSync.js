// A confirmed transaction may reach the UI before its snapshot listener does.
// Keep later listener events from replacing it with an older cached revision.
export function newestCatalog(current,next) {
  if (!current || !next) return next;
  if (next.revision < current.revision) return current;
  if (next.revision === current.revision && !current.cached && next.cached) return current;
  return next;
}
