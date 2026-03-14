import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none'

  const variants = {
    primary:
      'bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:-translate-y-px active:translate-y-0',
    ghost:
      'bg-transparent text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white active:bg-slate-700',
    danger:
      'bg-transparent text-red-400 border border-red-900 hover:bg-red-950 hover:text-red-300',
    icon: 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-violet-600 hover:text-white',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2',
  }

  const iconSize = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-10 h-10 text-lg',
  }

  const sizeClass = variant === 'icon' ? iconSize[size] : sizes[size]

  return (
    <button
      className={`${base} ${variants[variant]} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
