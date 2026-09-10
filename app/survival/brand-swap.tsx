"use client";

import { useEffect, useRef, type ReactNode } from "react";

const replacements: [RegExp, string][] = [
  [/Tiger Tide/g, "TwisWua"],
  [/TIGER TIDE/g, "TWISWUA"],
  [/TIGER/g, "TWISWUA"],
  [/Tiger/g, "TwisWua"],
  [/tiger/g, "TwisWua"],
];

function replaceBranding(value: string) {
  return replacements.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    value,
  );
}

function updateNode(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if (node.textContent) {
      const next = replaceBranding(node.textContent);
      if (next !== node.textContent) node.textContent = next;
    }
    node = walker.nextNode();
  }

  root.querySelectorAll<HTMLElement>("[aria-label], [title]").forEach((element) => {
    for (const attribute of ["aria-label", "title"]) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const next = replaceBranding(value);
      if (next !== value) element.setAttribute(attribute, next);
    }
  });
}

export default function BrandSwap({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    updateNode(root);
    const observer = new MutationObserver(() => updateNode(root));
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "title"],
    });

    return () => observer.disconnect();
  }, []);

  return <div ref={ref} style={{ display: "contents" }}>{children}</div>;
}
