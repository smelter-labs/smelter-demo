// Animated Accordion implementation with toggleAccordionBySelector/open/close methods
import { motion, AnimatePresence } from 'framer-motion';
import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  HTMLAttributes,
} from 'react';

type AccordionProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export type AccordionHandle = {
  /**
   * Toggle the accordion open if the given selector matches any child element.
   */
  toggleAccordionBySelector: (selector: string) => void;
  /**
   * Open the accordion if the given selector matches any child element.
   */
  openAccordionBySelector: (selector: string) => void;
  /**
   * Close the accordion if the given selector matches any child element.
   */
  closeAccordionBySelector: (selector: string) => void;
};

const Accordion = forwardRef<AccordionHandle, AccordionProps>(
  function Accordion(
    { title, children, defaultOpen = false, id = '', ...rest },
    ref,
  ) {
    const [open, setOpen] = useState(defaultOpen);

    const accordionContentRef = useRef<HTMLDivElement>(null);

    // Toggle the accordion if a child matching the selector is found
    const toggleAccordionBySelector = (selector: string) => {
      if (!accordionContentRef.current) return;
      if (accordionContentRef.current.querySelector(selector)) {
        setOpen((prev) => !prev);
      }
    };

    // Open the accordion if a child matching the selector is found
    const openAccordionBySelector = (selector: string) => {
      if (!accordionContentRef.current) return;
      if (accordionContentRef.current.querySelector(selector)) {
        setOpen(true);
      }
    };

    // Close the accordion if a child matching the selector is found
    const closeAccordionBySelector = (selector: string) => {
      if (!accordionContentRef.current) return;
      if (accordionContentRef.current.querySelector(selector)) {
        setOpen(false);
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        toggleAccordionBySelector,
        openAccordionBySelector,
        closeAccordionBySelector,
      }),
      [],
    );

    return (
      <div
        className='border-b border-[#414154] border-1 rounded-lg mb-2'
        data-open={open}
        data-accordion='true'
        id={id}
        {...rest}>
        <button
          type='button'
          className='flex items-center w-full px-2 py-2 focus:outline-none select-none bg-purple-100 rounded-t-lg border-[#414154] border-b-1 cursor-pointer mb-2'
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}>
          <span
            className='transition-transform duration-300 mr-2 flex items-center justify-center'
            style={{
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              color: '#fff', // ensure arrow is visible
            }}>
            <svg width='18' height='18' viewBox='0 0 20 20' fill='none'>
              <path
                d='M7 5L13 10L7 15'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </span>
          <h3 className='text-white text-base font-semibold mt-1 mb-1'>
            {title}
          </h3>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key='content'
              className='px-2 pb-2'
              initial='collapsed'
              animate='open'
              exit='collapsed'
              variants={{
                open: { height: 'auto', opacity: 1, marginTop: 0 },
                collapsed: { height: 0, opacity: 0, marginTop: 0 },
              }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'visible' }}>
              <div className='p-2' ref={accordionContentRef}>
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

export default Accordion;
