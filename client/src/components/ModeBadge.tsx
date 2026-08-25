/** aiMode 为 mock 时页面角落的小角标 */
export default function ModeBadge() {
  return (
    <div className="pointer-events-none fixed right-3 top-3 z-40">
      <span className="rounded-btn border border-blue/30 bg-blue/10 px-2.5 py-1 text-[11px] font-semibold text-blue-deep shadow-card-sm">
        演示模式
      </span>
    </div>
  );
}
