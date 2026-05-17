import { memo, useState, useCallback } from 'react'

export interface BuscaProdutosProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const BuscaProdutos = memo(function BuscaProdutos({
  value,
  onChange,
  placeholder = 'Buscar no cardápio...',
  className = ''
}: BuscaProdutosProps) {
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }, [onChange])

  const handleClear = useCallback(() => {
    onChange('')
  }, [onChange])

  return (
    <div className={`relative ${className}`}>
      <span
        className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors ${
          isFocused ? 'text-primary' : ''
        }`}
      >
        search
      </span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="w-full bg-surface-container border border-outline-variant/10 rounded-xl py-3 pl-10 pr-10 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-background transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </div>
  )
})

export default BuscaProdutos
