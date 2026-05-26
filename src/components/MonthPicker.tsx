import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTHS_PT } from "@/lib/format";

type Props = {
  year: number;
  monthIdx: number;
  onChange: (year: number, monthIdx: number) => void;
};

export function MonthPicker({ year, monthIdx, onChange }: Props) {
  const prev = () => {
    const m = monthIdx - 1;
    if (m < 0) onChange(year - 1, 11);
    else onChange(year, m);
  };
  const next = () => {
    const m = monthIdx + 1;
    if (m > 11) onChange(year + 1, 0);
    else onChange(year, m);
  };
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-1 py-1 shadow-sm">
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={prev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[10rem] text-center text-sm font-medium">
        {MONTHS_PT[monthIdx]} {year}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={next}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
