// Animated Accordion implementation
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className='border-b border-gray-700 border-1 rounded-lg mb-2'>
      <button
        type='button'
        className='flex items-center w-full px-2 py-2 focus:outline-none select-none bg-purple-100 rounded-t-lg border-gray-700 border-1 cursor-pointer mb-2'
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}>
        <span
          className={`transition-transform duration-300 mr-2 flex items-center justify-center`}
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
            style={{ overflow: 'hidden' }}>
            <div className='p-2'>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
