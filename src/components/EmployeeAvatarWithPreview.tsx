import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export type EmployeeAvatarWithPreviewProps = {
  name?: string | null;
  imageUrl?: string | null;
  /**
   * Optional tooltip text (uses `name` by default).
   */
  title?: string;
  /**
   * Controls how many letters to show when falling back to initials.
   * - `1`: first letter of the first word
   * - `2`: initials from the first 2 words (or first 2 chars for a single word)
   */
  letters?: 1 | 2;
  /**
   * Background/gradient classes applied to the Avatar root and fallback.
   * Examples: "bg-gradient-to-br from-violet-400 to-fuchsia-400"
   */
  bgClassName?: string;
  /**
   * Extra classes for the Avatar root (size, border, rounding, etc).
   */
  className?: string;
  /**
   * Extra classes for the initials text inside AvatarFallback.
   */
  textClassName?: string;
  /**
   * When true, clicking the avatar opens a circular profile preview dialog.
   */
  previewOnClick?: boolean;
};

function getInitials(name: string | null | undefined, letters: 1 | 2): string {
  const raw = (name ?? "").trim();
  if (!raw) return "?";

  const parts = raw.split(/\s+/).filter(Boolean);
  if (letters === 1) {
    return (parts[0]?.[0] ?? "?").toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

export default function EmployeeAvatarWithPreview({
  name,
  imageUrl,
  title,
  letters = 2,
  bgClassName = "bg-gradient-to-br from-violet-400 to-fuchsia-400",
  className,
  textClassName = "text-xs font-bold",
  previewOnClick = true,
}: EmployeeAvatarWithPreviewProps) {
  const initials = getInitials(name, letters);
  const alt = name ? `${name} avatar` : "Employee avatar";
  const [open, setOpen] = React.useState(false);

  const avatar = (
    <Avatar
      title={title ?? (name || undefined)}
      className={[
        bgClassName,
        // Avatar fallback needs a background too; Avatar root background helps when the image fails to load.
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {imageUrl ? <AvatarImage src={imageUrl} alt={alt} /> : null}
      <AvatarFallback
        className={[bgClassName, "flex items-center justify-center text-white", textClassName].join(" ")}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <>
      {previewOnClick ? (
        <button
          type="button"
          className="inline-flex items-center justify-center cursor-pointer"
          onClick={() => setOpen(true)}
          aria-label={title ?? alt}
        >
          {avatar}
        </button>
      ) : (
        avatar
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={[
            // Make it look like an Instagram profile photo popup
            "max-w-none w-full p-0 bg-transparent border-0 shadow-none",
            "[&>button]:hidden",
          ].join(" ")}
        >
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Clicking outside closes (Radix handles it too, but this improves UX) */}
            <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />

            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="rounded-full overflow-hidden shadow-2xl ring-4 ring-white/20">
                <Avatar
                  title={title ?? (name || undefined)}
                  className={[bgClassName, "h-56 w-56", "rounded-full"].filter(Boolean).join(" ")}
                >
                  {imageUrl ? <AvatarImage src={imageUrl} alt={alt} /> : null}
                  <AvatarFallback className={[bgClassName, "flex items-center justify-center text-white text-2xl font-bold"].join(" ")}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {name ? <div className="mt-4 text-sm font-semibold text-white/90">{name}</div> : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

