
import React from 'react';
import { useI18n } from '../../i18n';

export const RarityButton: React.FC<{ rarity: string, onClick: () => void }> = ({ rarity, onClick }) => {
    const { t } = useI18n();
    const colors: Record<string, string> = {
        Abundant: 'bg-gray-500 hover:bg-gray-400 border-gray-600',
        Common: 'bg-green-600 hover:bg-green-500 border-green-700',
        Uncommon: 'bg-blue-600 hover:bg-blue-500 border-blue-700',
        Rare: 'bg-pink-600 hover:bg-pink-500 border-pink-700',
        VeryRare: 'bg-yellow-600 hover:bg-yellow-500 border-yellow-700',
        ExtremelyRare: 'bg-orange-600 hover:bg-orange-500 border-orange-700'
    };

    return (
        <button 
            onClick={onClick}
            className={`${colors[rarity] || 'bg-gray-600'} text-white text-[10px] px-2 py-1.5 rounded border shadow-sm font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95`}
            title={t(`rarity.${rarity}`)}
        >
            {rarity.substring(0, 3)}
        </button>
    );
};
