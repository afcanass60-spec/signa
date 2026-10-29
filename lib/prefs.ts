"use client";
/** Préférences locales (par navigateur). */
import { useEffect, useState } from "react";

export function useLefty(): [boolean, (v: boolean) => void] {
  const [lefty, setLefty] = useState(false);
  useEffect(() => {
    try {
      setLefty(localStorage.getItem("signa-lefty") === "1");
    } catch {}
  }, []);
  return [
    lefty,
    (v) => {
      setLefty(v);
      try {
        localStorage.setItem("signa-lefty", v ? "1" : "0");
      } catch {}
    },
  ];
}
