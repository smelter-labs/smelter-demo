import {
  addTwitchInput,
  connectInput,
  addMP4Input,
  Input,
  InputSuggestions,
  getMP4Suggestions,
  getTwitchSuggestions,
  // --- Add your Kick input action here when available ---
  // addKickInput,
} from '@/app/actions';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/spinner';
import { motion, AnimatePresence } from 'framer-motion';
import type { MP4Suggestions } from '@/app/actions';
import { SuggestionBox } from './suggestion-box';

// --- GenericAddInputForm ---
export type GenericAddInputFormProps<T> = {
  inputs: Input[];
  roomId: string;
  refreshState: () => Promise<void>;
  suggestions: T[];
  filterSuggestions?: (
    suggestions: T[],
    currentSuggestion: string,
    inputs: Input[],
  ) => T[];
  placeholder: string;
  onSubmit: (value: string) => Promise<void>;
  renderSuggestion: (
    suggestion: T,
    idx: number,
    highlighted: boolean,
  ) => React.ReactNode;
  getSuggestionValue: (suggestion: T) => string;
  buttonText: string;
  loadingText?: string;
  validateInput?: (value: string) => string | undefined; // returns error message if invalid
};

export function GenericAddInputForm<T>({
  inputs,
  roomId,
  refreshState,
  suggestions,
  filterSuggestions,
  placeholder,
  onSubmit,
  renderSuggestion,
  getSuggestionValue,
  buttonText,
  loadingText,
  validateInput,
}: GenericAddInputFormProps<T>) {
  const [currentSuggestion, setCurrentSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionBoxRef = useRef<HTMLDivElement | null>(null);

  // Track window width for responsive suggestion box alignment
  const [windowWidth, setWindowWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }
    setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter suggestions if filterSuggestions is provided
  const filteredSuggestions = filterSuggestions
    ? filterSuggestions(suggestions, currentSuggestion, inputs)
    : suggestions;

  // Hide suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // Keyboard navigation for suggestions
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredSuggestions.length, showSuggestions, currentSuggestion]);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || filteredSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
      );
    } else if (e.key === 'Enter') {
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < filteredSuggestions.length
      ) {
        e.preventDefault();
        setCurrentSuggestion(
          getSuggestionValue(filteredSuggestions[highlightedIndex]),
        );
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  // Responsive suggestion box style
  const suggestionBoxClass =
    windowWidth !== undefined && windowWidth < 1280
      ? 'absolute z-30 left-0 right-0 mt-1 bg-black-90 border border-purple-40 rounded-md shadow-lg max-h-56 min-w-0 w-full overflow-y-auto text-sm sm:text-base'
      : 'absolute z-30 right-0 mt-1 bg-black-90 border border-purple-40 rounded-md shadow-lg max-h-56 min-w-[320px] sm:min-w-[400px] w-[120%] sm:w-[140%] overflow-y-auto text-sm sm:text-base';

  return (
    <form
      className='flex flex-row w-full gap-2 sm:gap-3 items-center relative'
      autoComplete='off'
      onSubmit={async (e) => {
        e.preventDefault();
        const value = currentSuggestion.trim();
        if (validateInput) {
          const error = validateInput(value);
          if (error) {
            toast.error(error);
            return;
          }
        }
        setLoading(true);
        try {
          await onSubmit(value);
          await refreshState();
          setCurrentSuggestion('');
        } catch (err) {
          // onSubmit should handle toast error
        } finally {
          setLoading(false);
        }
      }}>
      <div className='relative flex-1 min-w-0'>
        <input
          ref={inputRef}
          className='p-2 border-purple-40 border text-purple-20 bg-transparent rounded-md w-full min-w-0 text-sm sm:text-base sm:p-2 outline-none focus:ring-2 focus:ring-purple-60 transition-all'
          value={currentSuggestion}
          onChange={(event) => {
            setCurrentSuggestion(event.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay hiding to allow click
            setTimeout(() => setShowSuggestions(false), 100);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          autoComplete='off'
          spellCheck={false}
        />
        <SuggestionBox<T>
          suggestions={filteredSuggestions}
          show={showSuggestions}
          highlightedIndex={highlightedIndex}
          onSelect={(suggestion) => {
            setCurrentSuggestion(getSuggestionValue(suggestion));
            setShowSuggestions(false);
          }}
          suggestionBoxRef={suggestionBoxRef}
          inputRef={inputRef}
          suggestionBoxClass={suggestionBoxClass}
          renderSuggestion={renderSuggestion}
        />
      </div>
      <Button
        size='lg'
        variant='default'
        className='bg-purple-80 hover:bg-purple-100 text-white-100 font-semibold cursor-pointer px-3 py-2 text-sm sm:text-base sm:px-6 sm:py-3 transition-all'
        type='submit'
        disabled={loading}>
        {loading ? (
          <LoadingSpinner size='sm' variant='spinner' />
        ) : (
          (loadingText ?? buttonText)
        )}
      </Button>
    </form>
  );
}
