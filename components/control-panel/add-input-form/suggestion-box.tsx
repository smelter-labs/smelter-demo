import { AnimatePresence, motion } from "framer-motion";

// --- Shared Generic AddInputForm ---
export type SuggestionBoxProps<T> = {
    suggestions: T[];
    show: boolean;
    highlightedIndex: number;
    onSelect: (suggestion: T) => void;
    onMouseDown?: (e: React.MouseEvent) => void;
    suggestionBoxRef: React.RefObject<HTMLDivElement | null>;
    inputRef: React.RefObject<HTMLInputElement | null>;
    suggestionBoxClass: string;
    renderSuggestion: (
        suggestion: T,
        idx: number,
        highlighted: boolean,
    ) => React.ReactNode;
};

export function SuggestionBox<T>({
    suggestions,
    show,
    highlightedIndex,
    onSelect,
    onMouseDown,
    suggestionBoxRef,
    inputRef,
    suggestionBoxClass,
    renderSuggestion,
}: SuggestionBoxProps<T>) {
    return (
        <AnimatePresence>
            {show && suggestions.length > 0 && (
                <motion.div
                    ref={suggestionBoxRef as React.RefObject<HTMLDivElement>}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className={suggestionBoxClass}
                    style={{
                        WebkitOverflowScrolling: 'touch',
                        overflowX: 'hidden',
                    }}>
                    {suggestions.map((suggestion, idx) => (
                        <button
                            type='button'
                            key={
                                // Try to get a unique key for each suggestion
                                typeof suggestion === 'string'
                                    ? suggestion
                                    : ((suggestion as any).streamId ?? idx)
                            }
                            className={`w-full text-left px-3 py-2 hover:bg-purple-80 hover:text-white-100 focus:bg-purple-100 focus:text-white-100 transition-colors
                ${highlightedIndex === idx ? 'bg-purple-80 text-white-100' : 'text-purple-20'}
              `}
                            onMouseDown={(e) => {
                                // Prevent input blur
                                e.preventDefault();
                                onMouseDown?.(e);
                            }}
                            onClick={() => {
                                onSelect(suggestion);
                                inputRef.current?.focus();
                            }}
                            tabIndex={-1}
                            style={{
                                whiteSpace: 'normal', // allow wrapping
                                wordBreak: 'break-word',
                            }}>
                            {renderSuggestion(suggestion, idx, highlightedIndex === idx)}
                        </button>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}