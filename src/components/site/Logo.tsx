import logoM from "@/assets/market-m.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src={logoM} alt="" aria-hidden className="h-[1.75rem] w-auto" />
      <span className="font-display text-[1.0625rem] font-semibold leading-none">
        whoismrkt
      </span>
    </div>
  );
}
