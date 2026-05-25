import { initials } from "../lib/chat";

type AvatarProps = {
  name?: string | null;
  image?: string | null;
  online?: boolean;
};

export function Avatar({ name, image, online }: AvatarProps) {
  return (
    <div className="avatar">
      {image ? <img src={image} alt="" /> : <span>{initials(name)}</span>}
      {online !== undefined ? <i className={online ? "presence online" : "presence"} /> : null}
    </div>
  );
}
