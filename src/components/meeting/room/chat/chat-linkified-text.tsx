import type { ReactElement } from "react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

type ChatLinkifiedTextProps = {
  text: string;
  isLocal?: boolean;
};

const LINK_CANDIDATE_REGEX =
  /((?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d{2,5})?(?:\/[^\s<>"']*)?)/gi;
const TRAILING_LINK_PUNCTUATION_REGEX = /[),.!?:;]+$/;

function normalizeLinkHref(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function splitTrailingPunctuation(value: string) {
  const punctuation = value.match(TRAILING_LINK_PUNCTUATION_REGEX)?.[0] ?? "";

  if (!punctuation) {
    return {
      linkText: value,
      punctuation,
    };
  }

  return {
    linkText: value.slice(0, -punctuation.length),
    punctuation,
  };
}

export function ChatLinkifiedText({ text, isLocal = false }: ChatLinkifiedTextProps) {
  const parts = useMemo<Array<string | ReactElement>>(() => {
    const nextParts: Array<string | ReactElement> = [];
    let lastIndex = 0;

    for (const match of text.matchAll(LINK_CANDIDATE_REGEX)) {
      const rawMatch = match[0];
      const matchIndex = match.index ?? 0;

      if (text[matchIndex - 1] === "@") {
        continue;
      }

      const { linkText, punctuation } = splitTrailingPunctuation(rawMatch);

      if (!linkText) {
        continue;
      }

      if (matchIndex > lastIndex) {
        nextParts.push(text.slice(lastIndex, matchIndex));
      }

      nextParts.push(
        <a
          key={`${matchIndex}-${linkText}`}
          href={normalizeLinkHref(linkText)}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            "font-medium underline decoration-current/55 underline-offset-3 transition hover:decoration-current",
            isLocal ? "text-primary-foreground" : "text-primary",
          )}
        >
          {linkText}
        </a>,
      );

      if (punctuation) {
        nextParts.push(punctuation);
      }

      lastIndex = matchIndex + rawMatch.length;
    }

    if (lastIndex < text.length) {
      nextParts.push(text.slice(lastIndex));
    }

    return nextParts;
  }, [isLocal, text]);

  return (
    <p className="wrap-break-word whitespace-pre-wrap">
      {parts.length > 0 ? parts : text}
    </p>
  );
}
