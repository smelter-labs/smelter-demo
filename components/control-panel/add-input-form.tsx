import { addInput, Input, InputSuggestions } from '@/app/actions';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/spinner';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [currentSuggestion, setCurrentSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionBoxRef = useRef<HTMLDivElement>(null);

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

  // Filter out already added channels and by input
  const filteredSuggestions = suggestions.twitch
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
    });

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
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        setCurrentSuggestion(filteredSuggestions[highlightedIndex].streamId);
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
      ? "absolute z-30 left-0 right-0 mt-1 bg-black-90 border border-purple-40 rounded-md shadow-lg max-h-56 min-w-0 w-full overflow-y-auto text-sm sm:text-base"
      : "absolute z-30 right-0 mt-1 bg-black-90 border border-purple-40 rounded-md shadow-lg max-h-56 min-w-[320px] sm:min-w-[400px] w-[120%] sm:w-[140%] overflow-y-auto text-sm sm:text-base";

  return (
    <form
      className='flex flex-row w-full gap-2 sm:gap-3 items-center relative'
      autoComplete="off"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const channelId =
          tryTwitchIdFromUrl(currentSuggestion) ?? currentSuggestion;
        try {
          await addInput(roomId, channelId);
          await refreshState();
          setCurrentSuggestion('');
        } catch (err) {
          toast.error(`Failed to add "${channelId}" Twitch.tv stream.`);
        } finally {
          setLoading(false);
        }
      }}>
      <div className="relative flex-1 min-w-0">
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
          placeholder='Channel ID or URL'
          autoComplete="off"
          spellCheck={false}
        />
        <AnimatePresence>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <motion.div
              ref={suggestionBoxRef}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className={suggestionBoxClass}
              style={{
                WebkitOverflowScrolling: 'touch',
                overflowX: 'hidden',
              }}
            >
              {filteredSuggestions.map((suggestion, idx) => (
                <button
                  type="button"
                  key={suggestion.streamId}
                  className={`w-full text-left px-3 py-2 hover:bg-purple-80 hover:text-white-100 focus:bg-purple-100 focus:text-white-100 transition-colors
                    ${highlightedIndex === idx ? 'bg-purple-80 text-white-100' : 'text-purple-20'}
                  `}
                  onMouseDown={(e) => {
                    // Prevent input blur
                    e.preventDefault();
                  }}
                  onClick={() => {
                    setCurrentSuggestion(suggestion.streamId);
                    setShowSuggestions(false);
                    inputRef.current?.focus();
                  }}
                  tabIndex={-1}
                  style={{
                    whiteSpace: 'normal', // allow wrapping
                    wordBreak: 'break-word',
                  }}
                >
                  <span className="font-semibold break-all">{suggestion.streamId}</span>
                  <br />
                  <span className="font-bold text-white-80 break-words">{suggestion.title}</span>
                  <span className="ml-2 text-white-60 block">[Twitch.tv]</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Button
        size='lg'
        variant='default'
        className='bg-purple-80 hover:bg-purple-100 text-white-100 font-semibold cursor-pointer px-3 py-2 text-sm sm:text-base sm:px-6 sm:py-3 transition-all'
        type='submit'
        disabled={loading}
      >
        {loading ? <LoadingSpinner size='sm' variant='spinner' /> : 'Add input'}
      </Button>
    </form>
  );
}

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
