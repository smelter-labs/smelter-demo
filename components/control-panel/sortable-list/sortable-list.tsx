import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  PointerSensorOptions,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  Active,
  UniqueIdentifier,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
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
  // Maintain a local state for the order of items
  const [orderedItems, setOrderedItems] = useState<T[]>(items);
  const [active, setActive] = useState<Active | null>(null);

  // Keep local orderedItems in sync with props.items if they change externally
  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const activeItem = useMemo(
    () => orderedItems.find((item) => item.id === active?.id),
    [active, orderedItems],
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
    const activeIndex = orderedItems.findIndex(({ id }) => id === active.id);

    setActive(active);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    onOrderChange(orderedItems);
    setActive(null);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (over && active.id !== over?.id) {
      const activeIndex = orderedItems.findIndex(({ id }) => id === active.id);
      const overIndex = orderedItems.findIndex(({ id }) => id === over.id);

      if (activeIndex !== -1 && overIndex !== -1) {
        const newItems = arrayMove(orderedItems, activeIndex, overIndex);
        setOrderedItems(newItems);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActive(null);
      }}>
      <SortableContext items={orderedItems}>
        <ul className='SortableList' role='application'>
          {orderedItems.map((item) => {
            // If this item is being dragged, apply opacity 0.5
            const isActive = active?.id === item.id;
            return (
              <li key={item.id} style={isActive ? { opacity: 0.5 } : undefined}>
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
