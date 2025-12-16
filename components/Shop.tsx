
import React, { useState } from 'react';
import { ShopItem, ItemCategory, PlayerInventory } from '../types';
import { ArrowLeft, Coins, Zap, Palette, Image as ImageIcon, Check, Lock, ShoppingBag, Hammer } from 'lucide-react';

interface ShopProps {
  inventory: PlayerInventory;
  onBuy: (item: ShopItem) => boolean;
  onClose: () => void;
  onEquip: (type: 'SKIN' | 'THEME', id: string) => void;
}

// Mock Data for the Shop
const SHOP_ITEMS: ShopItem[] = [
  // Boosters
  { id: 'booster_moves', name: '+5 Movimentos', description: 'Adiciona 5 movimentos extras na fase.', price: 150, category: 'BOOSTER', icon: 'moves' },
  { id: 'booster_bomb', name: 'Bomba Mágica', description: 'Começa a fase com uma Bomba Colorida.', price: 250, category: 'BOOSTER', icon: 'bomb' },
  { id: 'booster_shuffle', name: 'Embaralhar', description: 'Mistura o tabuleiro quando não houver jogadas.', price: 100, category: 'BOOSTER', icon: 'shuffle' },
  { id: 'booster_hammer', name: 'Marreta', description: 'Destrói qualquer peça ou obstáculo.', price: 300, category: 'BOOSTER', icon: 'hammer' },
  
  // Skins
  { id: 'skin_classic', name: 'Runas Clássicas', description: 'O visual original das runas.', price: 0, category: 'SKIN', icon: 'classic' },
  { id: 'skin_neon', name: 'Runas Neon', description: 'Brilho futurista para suas peças.', price: 1000, category: 'SKIN', icon: 'neon' },
  { id: 'skin_ancient', name: 'Pedras Ancestrais', description: 'Visual de pedra rústica e mística.', price: 2500, category: 'SKIN', icon: 'ancient' },

  // Themes
  { id: 'theme_default', name: 'Reino Padrão', description: 'A atmosfera clássica de Lumina.', price: 0, category: 'THEME', icon: 'default' },
  { id: 'theme_dark', name: 'Floresta Sombria', description: 'Um visual mais escuro e misterioso.', price: 1500, category: 'THEME', icon: 'dark' },
  { id: 'theme_candy', name: 'Mundo Doce', description: 'Uma homenagem colorida e divertida.', price: 3000, category: 'THEME', icon: 'candy' },
];

const Shop: React.FC<ShopProps> = ({ inventory, onBuy, onClose, onEquip }) => {
  const [activeTab, setActiveTab] = useState<ItemCategory>('BOOSTER');
  const [feedback, setFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const handlePurchase = (item: ShopItem) => {
    // Logic for equipping if already owned (for skins/themes)
    if (item.category !== 'BOOSTER') {
      const isOwned = item.category === 'SKIN' ? inventory.skins.includes(item.id) : inventory.themes.includes(item.id);
      if (isOwned) {
        onEquip(item.category as 'SKIN' | 'THEME', item.id);
        setFeedback({ msg: 'Equipado com sucesso!', type: 'success' });
        setTimeout(() => setFeedback(null), 1500);
        return;
      }
    }

    const success = onBuy(item);
    if (success) {
      setFeedback({ msg: 'Compra realizada!', type: 'success' });
    } else {
      setFeedback({ msg: 'Moedas insuficientes!', type: 'error' });
    }
    setTimeout(() => setFeedback(null), 1500);
  };

  const filteredItems = SHOP_ITEMS.filter(item => item.category === activeTab);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'moves': return <Zap className="text-yellow-400" />;
      case 'bomb': return <div className="w-6 h-6 rounded-full bg-gradient-to-r from-red-500 to-purple-500 animate-pulse" />;
      case 'shuffle': return <RefreshIcon />;
      case 'hammer': return <Hammer className="text-slate-300" />;
      default: return <ShoppingBag className="text-white" />;
    }
  };

  const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
  );

  return (
    <div className="absolute inset-0 z-[100] bg-slate-900 flex flex-col animate-[pop_0.3s_ease-out]">
      {/* Header */}
      <div className="p-4 bg-slate-800 shadow-lg flex justify-between items-center z-10">
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-transform z-50">
          <ArrowLeft size={24} className="text-white" />
        </button>
        <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            <ShoppingBag /> Loja Mágica
        </h1>
        <div className="bg-black/40 px-4 py-2 rounded-full flex items-center gap-2 border border-amber-500/30">
            <Coins size={20} className="text-yellow-400" fill="currentColor" />
            <span className="font-mono font-bold text-xl text-white">{inventory.coins}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-2 bg-slate-800/50 gap-2">
        <button 
            onClick={() => setActiveTab('BOOSTER')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'BOOSTER' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-slate-700 text-slate-400'}`}
        >
            <Zap size={18} /> Boosters
        </button>
        <button 
            onClick={() => setActiveTab('SKIN')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'SKIN' ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-slate-700 text-slate-400'}`}
        >
            <Palette size={18} /> Skins
        </button>
        <button 
            onClick={() => setActiveTab('THEME')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'THEME' ? 'bg-pink-600 text-white shadow-lg scale-105' : 'bg-slate-700 text-slate-400'}`}
        >
            <ImageIcon size={18} /> Temas
        </button>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
        <div className="grid grid-cols-1 gap-4 pb-20">
            {filteredItems.map(item => {
                let isOwned = false;
                let isEquipped = false;
                let quantity = 0;

                if (item.category === 'BOOSTER') {
                    if (item.id === 'booster_moves') quantity = inventory.boosters.moves_5;
                    if (item.id === 'booster_bomb') quantity = inventory.boosters.bomb;
                    if (item.id === 'booster_shuffle') quantity = inventory.boosters.shuffle;
                    if (item.id === 'booster_hammer') quantity = inventory.boosters.hammer;
                } else if (item.category === 'SKIN') {
                    isOwned = inventory.skins.includes(item.id);
                    isEquipped = inventory.activeSkin === item.id;
                } else if (item.category === 'THEME') {
                    isOwned = inventory.themes.includes(item.id);
                    isEquipped = inventory.activeTheme === item.id;
                }

                return (
                    <div key={item.id} className="bg-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-md border border-slate-700 relative overflow-hidden group">
                         {/* Card Background Glow */}
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors"></div>

                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-inner ${item.category === 'BOOSTER' ? 'bg-indigo-900' : 'bg-slate-900'}`}>
                            {getIcon(item.icon)}
                        </div>

                        <div className="flex-1 z-10">
                            <h3 className="font-bold text-lg text-white">{item.name}</h3>
                            <p className="text-xs text-slate-400 leading-tight">{item.description}</p>
                            
                            {item.category === 'BOOSTER' && (
                                <p className="text-xs text-indigo-300 font-bold mt-1">Em estoque: {quantity}</p>
                            )}
                        </div>

                        <div className="flex flex-col items-end gap-1 z-10">
                            <button 
                                onClick={() => handlePurchase(item)}
                                disabled={!isOwned && inventory.coins < item.price}
                                className={`
                                    px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-1 active:scale-95 transition-all
                                    ${isEquipped 
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/50 cursor-default'
                                        : isOwned 
                                            ? 'bg-slate-600 text-white hover:bg-slate-500' 
                                            : inventory.coins >= item.price
                                                ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    }
                                `}
                            >
                                {isEquipped ? (
                                    <><Check size={16} /> Equipado</>
                                ) : isOwned ? (
                                    'Equipar'
                                ) : (
                                    <>
                                        {item.price === 0 ? 'Grátis' : item.price}
                                        {item.price > 0 && <Coins size={14} fill="currentColor" />}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-2xl animate-[float-up_0.5s_ease-out] z-50 flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {feedback.type === 'success' ? <Check size={20} /> : <Lock size={20} />}
            {feedback.msg}
        </div>
      )}
    </div>
  );
};

export default Shop;
