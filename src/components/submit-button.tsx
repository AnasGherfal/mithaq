"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
};

/**
 * Submit button for Server Action forms. Disables itself while the action is running
 * so a double tap can never send the same action twice, and gives visible feedback.
 */
export function SubmitButton({ children, className = "", pendingText, disabled }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={`${className} focus-ring disabled:cursor-not-allowed disabled:opacity-60`}
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText ?? "جاري التنفيذ…"}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
