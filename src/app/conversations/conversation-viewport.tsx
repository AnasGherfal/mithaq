"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ConversationViewport({
  children,
  messageCount,
  stickToBottom,
}: {
  children: ReactNode;
  messageCount: number;
  stickToBottom: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stickToBottom && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [messageCount, stickToBottom]);

  return (
    <div className="max-h-[60vh] min-h-80 overflow-y-auto px-4 py-5 sm:px-6" ref={ref}>
      {children}
    </div>
  );
}
