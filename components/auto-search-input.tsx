"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

type Props = {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  showIcon?: boolean;
  delay?: number;
  targetPath?: string;
};

export function AutoSearchInput({
  name = "q",
  defaultValue = "",
  placeholder,
  className = "relative mt-1",
  inputClassName = "field pl-9",
  iconClassName = "absolute left-3 top-1/2 -translate-y-1/2 text-edp-muted",
  showIcon = true,
  delay = 350,
  targetPath
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const current = searchParams.get(name) || "";
    if (value === current) return;

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) {
        params.set(name, trimmed);
      } else {
        params.delete(name);
      }
      params.delete("page");
      const query = params.toString();
      const nextPath = targetPath || pathname;
      startTransition(() => {
        router.replace(query ? `${nextPath}?${query}` : nextPath, { scroll: false });
      });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, name, pathname, router, searchParams, targetPath, value]);

  const hasValue = value.trim().length > 0;

  return (
    <div className={className}>
      {showIcon && !hasValue ? <Search className={iconClassName} size={16} /> : null}
      <input
        className={hasValue || !showIcon ? inputClassName.replace(/\bpl-(?:8|9|10|11|12)\b/g, "") : inputClassName}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}
