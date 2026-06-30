import mrktIcon     from "@/assets/MRKT logo final.png";
import mrktWordmark from "@/assets/MRKT wordmark final.png";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  wordmarkOnly?: boolean;
}

export function Logo({ className = "", iconOnly = false, wordmarkOnly = false }: LogoProps) {
  if (iconOnly) {
    return (
      <img src={mrktIcon} alt="MRKT" className={`h-7 w-auto ${className}`} />
    );
  }
  if (wordmarkOnly) {
    return (
      <img src={mrktWordmark} alt="MRKT" className={`h-5 w-auto ${className}`} />
    );
  }
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src={mrktIcon}     alt=""     aria-hidden className="h-7 w-auto shrink-0" />
      <img src={mrktWordmark} alt="MRKT"             className="h-[26px] w-auto shrink-0" />
    </div>
  );
}
