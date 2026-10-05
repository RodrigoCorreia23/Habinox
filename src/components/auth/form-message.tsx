import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormMessage({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (error) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (success) {
    return (
      <Alert role="status">
        <AlertDescription>{success}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
