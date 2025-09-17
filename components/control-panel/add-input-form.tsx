import {
  addInput,
  connectInput,
  addMP4Input,
  Input,
  InputSuggestions,
  getMP4Suggestions,
} from '@/app/actions';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/spinner';
import { motion, AnimatePresence } from 'framer-motion';
import type { MP4Suggestions } from '@/app/actions';

// --- Shared Generic AddInputForm ---
type SuggestionBoxProps<T> = {
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

function SuggestionBox<T>({
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

type GenericAddInputFormProps<T> = {
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

function GenericAddInputForm<T>({
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

// --- AddInputForm for Twitch ---
export default function AddInputForm({
  inputs,
  suggestions,
  roomId,
  refreshState,
}: {
  inputs: Input[];
  suggestions: InputSuggestions;
  roomId: string;
  refreshState: () => Promise<void>;
}) {
  function tryTwitchIdFromUrl(maybeUrl: string): string | undefined {
    try {
      // Use WHATWG URL for browser compatibility
      const url = new URL(maybeUrl, 'https://dummy.base'); // fallback for relative
      if (['www.twitch.tv', 'twitch.tv'].includes(url.host)) {
        // Remove leading/trailing slashes
        return url.pathname.replace(/^\/+|\/+$/g, '');
      }
    } catch {
      return;
    }
  }

  return (
    <GenericAddInputForm
      inputs={inputs}
      roomId={roomId}
      refreshState={refreshState}
      suggestions={suggestions.twitch}
      filterSuggestions={(twitchSuggestions, currentSuggestion, inputs) =>
        twitchSuggestions
          .filter((suggestion) => {
            for (const input of inputs) {
              if (input.twitchChannelId === suggestion.streamId) {
                return false;
              }
            }
            return true;
          })
          .filter((suggestion) => {
            if (!currentSuggestion) return true;
            return (
              suggestion.streamId
                .toLowerCase()
                .includes(currentSuggestion.toLowerCase()) ||
              suggestion.title
                .toLowerCase()
                .includes(currentSuggestion.toLowerCase())
            );
          })
      }
      placeholder='Channel ID or URL'
      onSubmit={async (value: string) => {
        const channelId = tryTwitchIdFromUrl(value) ?? value;
        try {
          const newInput = await addInput(roomId, channelId);
          await connectInput(roomId, newInput.inputId);
        } catch (err) {
          toast.error(`Failed to add "${channelId}" Twitch.tv stream.`);
          throw err;
        }
      }}
      renderSuggestion={(suggestion, idx, highlighted) => (
        <>
          <span className='font-semibold break-all'>{suggestion.streamId}</span>
          <br />
          <span className='font-bold text-white-80 break-words'>
            {suggestion.title}
          </span>
          <span className='ml-2 text-white-60 block'>[Twitch.tv]</span>
        </>
      )}
      getSuggestionValue={(suggestion) => suggestion.streamId}
      buttonText='Add input'
      loadingText='Add input'
      validateInput={undefined}
    />
  );
}

// --- AddMP4InputForm ---
export function AddMP4InputForm({
  inputs,
  roomId,
  refreshState,
}: {
  inputs: Input[];
  roomId: string;
  refreshState: () => Promise<void>;
}) {
  const [mp4Suggestions, setMp4Suggestions] = useState<MP4Suggestions>({
    mp4s: [],
  });

  useEffect(() => {
    getMP4Suggestions().then(setMp4Suggestions);
  }, []);

  return (
    <GenericAddInputForm<string>
      inputs={inputs}
      roomId={roomId}
      refreshState={refreshState}
      suggestions={mp4Suggestions.mp4s}
      // No filtering, just show all
      placeholder='MP4 URL or select from list'
      onSubmit={async (mp4FileName: string) => {
        if (!mp4FileName) {
          toast.error('Please enter or select an MP4 URL.');
          throw new Error('No MP4 URL');
        }
        try {
          await addMP4Input(roomId, mp4FileName);
        } catch (err) {
          toast.error(`Failed to add "${mp4FileName}" MP4 input.`);
          throw err;
        }
      }}
      renderSuggestion={(mp4Url, idx, highlighted) => (
        <>
          <span className='font-semibold break-all'>{mp4Url}</span>
          <span className='ml-2 text-white-60 block'>[MP4]</span>
        </>
      )}
      getSuggestionValue={(mp4Url) => mp4Url}
      buttonText='Add MP4'
      loadingText='Add MP4'
      validateInput={(value) =>
        !value ? 'Please enter or select an MP4 URL.' : undefined
      }
    />
  );
}
