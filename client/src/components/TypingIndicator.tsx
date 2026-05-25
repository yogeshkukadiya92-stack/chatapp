type TypingIndicatorProps = {
  names: string[];
};

export function TypingIndicator({ names }: TypingIndicatorProps) {
  if (!names.length) {
    return null;
  }

  return (
    <div className="typing-indicator">
      <span>{names.join(", ")} typing</span>
      <i />
      <i />
      <i />
    </div>
  );
}
