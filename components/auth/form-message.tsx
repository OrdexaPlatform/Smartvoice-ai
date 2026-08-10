type FormMessageProps = {
  type: "error" | "success";
  message: string;
};

export function FormMessage({ type, message }: FormMessageProps) {
  if (!message) return null;

  const styles =
    type === "error"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : "bg-accent text-accent-foreground border-primary/20";

  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${styles}`}>
      {message}
    </div>
  );
}
