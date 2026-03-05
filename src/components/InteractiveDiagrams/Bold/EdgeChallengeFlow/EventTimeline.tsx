import React, { useEffect, useRef } from 'react';
import type { DecodedEvent, LevelMeta, EdgeAddedMeta } from './types';
import { formatEvent } from './edgeChallengeLogic';

interface EventTimelineProps {
  appliedEvents: DecodedEvent[];
  currentIndex: number;
  levelMeta: LevelMeta;
  edgeAddedById: Map<string, EdgeAddedMeta>;
  rangeByEdgeId: Map<string, { start: bigint; end: bigint }>;
}

export default function EventTimeline({
  appliedEvents,
  currentIndex,
  levelMeta,
  edgeAddedById,
  rangeByEdgeId,
}: EventTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const currentItem = container.querySelector('.ecf-log-current') as HTMLElement | null;
    if (currentItem) {
      // Scroll only within the timeline container, not the whole page
      const containerRect = container.getBoundingClientRect();
      const itemRect = currentItem.getBoundingClientRect();
      const offset = itemRect.top - containerRect.top + container.scrollTop;
      container.scrollTop = offset - containerRect.height / 2;
    }
  }, [currentIndex]);

  return (
    <div className="ecf-timeline" ref={containerRef}>
      <h3>Event Timeline</h3>
      <ol className="ecf-event-log">
        {appliedEvents.map((ev, index) => (
          <li
            key={`${ev.blockNumber}-${ev.logIndex}`}
            className={index === currentIndex ? 'ecf-log-current' : undefined}
          >
            [{ev.blockNumber}/{ev.logIndex}]{' '}
            {formatEvent(ev, levelMeta, edgeAddedById, rangeByEdgeId)}
          </li>
        ))}
      </ol>
    </div>
  );
}
