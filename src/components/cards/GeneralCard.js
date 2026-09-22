import clsx from 'clsx';

export default function GeneralCard({className, children}) {
  return (
    <section className={clsx('bg-white shadow-sm border border-gray-200 rounded-lg p-2', className)}>
      {children}
    </section>
  )
}
