export function WarningBanner(props: { message: string }) {
  return (
    <div className='text-center py-4 lg:px-4'>
      <div
        className='p-2 bg-yellow-400 items-center text-yellow-900 leading-none lg:rounded-full flex lg:inline-flex'
        role='alert'>
        <span className='flex rounded-full bg-yellow-500 uppercase px-2 py-1 text-xs font-bold mr-3'>
          Warning
        </span>
        <span className='font-semibold mr-2 text-left flex-auto'>
          {props.message}
        </span>
      </div>
    </div>
  );
}
