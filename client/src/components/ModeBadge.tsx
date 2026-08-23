/** aiMode 为 mock 时页面角落的小角标 */
export default function ModeBadge() {
  return (
    <div className="pointer-events-none fixed right-3 top-3 z-40">
      <span className="rounded-full border border-teal/40 bg-teal/15 px-2.5 py-1 text-[11px] font-medium text-teal-deep shadow-page">
        演示模式
      </span>
    </div>
  );
}
