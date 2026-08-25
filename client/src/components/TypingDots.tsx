/** 打字指示：三点跳动 */
export default function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1" aria-label="对方正在输入">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-ink-3 animate-dot-bounce"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}
