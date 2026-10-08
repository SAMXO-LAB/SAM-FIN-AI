import { PresetAvatar, defaultKey, isPresetKey, type Gender } from "./presets";

export type AvatarInfo = { id: string; name: string; gender: Gender; avatar_kind: "default" | "preset" | "photo"; avatar_key: string | null; avatar_updated_at: string | null };

/** A user's picture: their own photo, a chosen built-in avatar, or an automatic default for their gender. */
export function Avatar({ user, size = 38, label = false }: { user: AvatarInfo; size?: number; label?: boolean }) {
  const title = label ? `${user.name}’s profile picture` : undefined;
  if (user.avatar_kind === "photo") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar-img" src={`/api/avatar?v=${encodeURIComponent(user.avatar_updated_at ?? "0")}`} width={size} height={size} alt={title ?? ""} style={{ width: size, height: size }} />;
  }
  const key = user.avatar_kind === "preset" && isPresetKey(user.avatar_key) ? user.avatar_key : defaultKey(user.gender, user.id);
  return <PresetAvatar id={key} size={size} title={title} />;
}
