import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-2 font-semibold rounded-lg transition-all duration-150 disabled:opacity-40',
        {
          'bg-brand-accent hover:bg-purple-600 text-white shadow-glow': variant === 'primary',
          'bg-transparent hover:bg-brand-card text-brand-sub hover:text-brand-text': variant === 'ghost',
          'bg-red-700/20 hover:bg-red-700/40 text-red-400 border border-red-700/40': variant === 'danger',
          'border border-brand-border hover:border-brand-accent text-brand-text bg-transparent': variant === 'outline',
          'px-3 py-1.5 text-xs': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
