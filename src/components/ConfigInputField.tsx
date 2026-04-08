import React from 'react'

interface ConfigInputFieldProps {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: string
}

export const ConfigInputField: React.FC<ConfigInputFieldProps> = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1 block">{label}</label>
    <input 
      type={type} 
      value={value ?? ''} 
      onChange={e => onChange(e.target.value)} 
      className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-[#e8391a] transition-all" 
    />
  </div>
)

