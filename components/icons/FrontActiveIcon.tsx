import React from 'react';
import { Target } from 'lucide-react';

export const FrontActiveIcon = ({ version = 1 }: { version?: number }) => {
    const isTier2 = version === 2;
    const colorClass = isTier2 ? 'text-purple-400' : 'text-sky-400';
    const glowColor = isTier2 ? 'rgba(168, 85, 247, 0.8)' : 'rgba(56, 189, 248, 0.8)';
    
    return (
        <Target 
            size={32} 
            strokeWidth={1.5} 
            className={`${colorClass} drop-shadow-[0_0_10px_${glowColor}]`} 
        />
    );
};