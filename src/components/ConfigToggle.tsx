import React from 'react'

interface ConfigToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export const ConfigToggle: React.FC<ConfigToggleProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between p-4 bg-[#252830] rounded-xl cursor-pointer hover:bg-[#333] transition-all">
    <span className="text-sm font-bold text-white">{label}</span>
    <div 
      className={`w-12 h-7 rounded-full transition-all relative ${checked ? 'bg-[#e8391a]' : 'bg-[#1a1a1a]'}`} 
      onClick={() => onChange(!checked)}
    >
      <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </div>
  </label>
)

