export function FormMessage({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (error) {
    return (
      <p role="alert" className="text-night-error text-sm">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="border-amber text-night-text border-l-2 pl-4 text-base">
        {success}
      </p>
    );
  }
  return null;
}
