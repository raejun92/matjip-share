"use client";

import { useRef, useState } from "react";
import { snapSheetRatio, SHEET_SNAP } from "@/lib/sheet";

/**
 * 바텀 시트 드래그(grabber) 훅 (slice 9).
 * 반환된 maxHeight를 시트 스타일에, handleProps를 핸들 요소에 붙인다.
 */
export function useSheetDrag(onClose: () => void) {
  const [ratio, setRatio] = useState<number>(SHEET_SNAP.default);
  const dragRef = useRef<{ startY: number; startRatio: number } | null>(null);

  const handleProps = {
    onPointerDown: (e: React.PointerEvent) => {
      dragRef.current = { startY: e.clientY, startRatio: ratio };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const delta = (dragRef.current.startY - e.clientY) / window.innerHeight;
      const next = Math.min(0.92, Math.max(0.15, dragRef.current.startRatio + delta));
      setRatio(next);
    },
    onPointerUp: () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setRatio((current) => {
        const snapped = snapSheetRatio(current);
        if (snapped === "close") {
          onClose();
          return SHEET_SNAP.default;
        }
        return snapped;
      });
    },
  };

  // 고정 높이 스냅 (max-height면 내용이 짧을 때 드래그해도 커지지 않는다)
  return { height: `${ratio * 100}dvh`, handleProps };
}

type HandleProps = ReturnType<typeof useSheetDrag>["handleProps"];

/** 시트 상단 grabber 바 */
export function SheetDragHandle(props: HandleProps) {
  return (
    <div
      {...props}
      data-testid="sheet-handle"
      aria-label="시트 크기 조절"
      className="-mt-2 flex shrink-0 cursor-grab touch-none justify-center py-2.5 active:cursor-grabbing"
    >
      <span className="h-1 w-10 rounded-full bg-gray-300" />
    </div>
  );
}
