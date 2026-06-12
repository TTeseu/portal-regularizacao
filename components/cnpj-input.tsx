"use client";

import type { InputHTMLAttributes } from "react";
import { applyCNPJMask, cnpjDigits, isValidCNPJ } from "@/lib/cnpj";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "defaultValue"> & {
  defaultValue?: string | null;
};

export function CNPJInput({ defaultValue, className = "field mt-1", ...props }: Props) {
  return (
    <input
      {...props}
      className={className}
      defaultValue={applyCNPJMask(defaultValue)}
      inputMode="numeric"
      maxLength={18}
      placeholder={props.placeholder || "00.000.000/0000-00"}
      onChange={(event) => {
        const rawDigits = cnpjDigits(event.currentTarget.value);
        const formatted = applyCNPJMask(event.currentTarget.value);
        const invalid = formatted && (rawDigits.length !== 14 || !isValidCNPJ(formatted));
        event.currentTarget.value = formatted;
        event.currentTarget.dataset.cnpjInvalid = invalid ? "1" : "";
        event.currentTarget.setCustomValidity(invalid ? "CNPJ inválido." : "");
      }}
      onBlur={(event) => {
        const formatted = applyCNPJMask(event.currentTarget.value);
        const invalid = formatted && (event.currentTarget.dataset.cnpjInvalid === "1" || !isValidCNPJ(formatted));
        event.currentTarget.value = formatted;
        event.currentTarget.setCustomValidity(invalid ? "CNPJ inválido." : "");
      }}
    />
  );
}
