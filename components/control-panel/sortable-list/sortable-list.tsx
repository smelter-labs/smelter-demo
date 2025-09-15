import React, { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  PointerSensorOptions,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Active, UniqueIdentifier, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import './sortable-list.css';
import { SortableOverlay } from '@/components/control-panel/sortable-overlay/sortable-overlay';

interface BaseItem {
  id: UniqueIdentifier;
}

interface Props<T extends BaseItem> {
  items: T[];
  renderItem(item: T): ReactNode;
  onOrderChange(items: T[]): void;
}

export function SortableList<T extends BaseItem>({
  items,
  renderItem,
  onOrderChange,
}: Props<T>) {
  const [active, setActive] = useState<Active | null>(null);
  const activeItem = useMemo(
    () => items.find((item) => item.id === active?.id),
    [active, items],
  );
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const IGNORE_TAGS = ['BUTTON'];

  const customHandleEvent = (element: HTMLElement | null) => {
    let cur = element;

    while (cur) {
      if (IGNORE_TAGS.includes(cur.tagName) || cur.dataset.noDnd) {
        return false;
      }
      cur = cur.parentElement;
    }

    return true;
  };
  PointerSensor.activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (
        //@ts-expect-error todo for laters
        { nativeEvent: event }: PointerEvent<Element>,
        { onActivation }: PointerSensorOptions,
      ) => customHandleEvent(event.target as HTMLElement),
    },
  ];


  const handleDragStart = ({ active }: DragStartEvent) => {
    console.log('handleDragStart', active);
    setActive(active);
  };


  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over?.id) {
      const activeIndex = items.findIndex(({ id }) => id === active.id);
      const overIndex = items.findIndex(({ id }) => id === over.id);

      const newItems = arrayMove(items, activeIndex, overIndex);
      if (onOrderChange) {
        onOrderChange(newItems);
      }
    }
    setActive(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActive(null);
      }}>
      <SortableContext items={items}>
        <ul className='SortableList' role='application'>
          {items.map((item) => {
            // If this item is being dragged, apply opacity 0.5
            const isActive = active?.id === item.id;
            return (
              <li
                key={item.id}
                style={isActive ? { opacity: 0.5 } : undefined}
              >
                {renderItem(item)}
              </li>
            );
          })}
        </ul>
      </SortableContext>
      <SortableOverlay>
        {activeItem ? renderItem(activeItem) : null}
      </SortableOverlay>
    </DndContext>
  );
}
