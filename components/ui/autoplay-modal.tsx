import { motion } from 'framer-motion';
import { Button } from './button';

interface AutoplayModalProps {
  onAllow: () => void;
  onDeny: () => void;
}

export default function AutoplayModal({ onAllow, onDeny }: AutoplayModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 '>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className='bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md mx-4 '>
        <h3 className='text-white text-lg font-semibold mb-4'>Play Video?</h3>
        <p className='text-gray-300 mb-6'>
          Browsers don&apos;t allow videos to play automatically. If you want to
          start the video now, please confirm.
        </p>
        <div className='flex gap-3 justify-end'>
          <Button
            size='lg'
            variant='default'
            onClick={onDeny}
            className='bg-purple-80 hover:bg-purple-100 text-white-100 font-bold cursor-pointer'>
            Not Now
          </Button>
          <Button
            size='lg'
            variant='default'
            onClick={onAllow}
            className='text-white-100 font-bold bg-red-40 border-0 hover:bg-red-60 cursor-pointer'>
            Play Video
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
