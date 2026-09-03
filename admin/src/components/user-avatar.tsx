import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarUrl, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * `profiles.avatar_color` is the colour the mobile app already assigned this
 * account, so the fallback matches what the user sees of themselves.
 */
export function UserAvatar({
  name,
  email,
  avatarPath,
  color,
  className,
}: {
  name?: string | null;
  email?: string | null;
  avatarPath?: string | null;
  color?: string | null;
  className?: string;
}) {
  const src = avatarUrl(avatarPath);
  const isHex = typeof color === "string" && /^#[0-9a-f]{3,8}$/i.test(color);

  return (
    <Avatar className={cn("size-8 shrink-0", className)}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback
        className="text-[11px] font-medium"
        style={
          isHex
            ? { backgroundColor: color as string, color: "#fff" }
            : undefined
        }
      >
        {initials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
