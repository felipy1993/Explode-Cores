
import React, { useState } from 'react';
import { X, Music, Volume2, VolumeX, User, Check, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { audioManager } from '../utils/audioManager';

interface SettingsModalProps {
  onClose: () => void;
  currentAvatar: string;
  onUpdateAvatar: (url: string) => void;
}

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Gizmo',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Princess',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Midnight',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Leo',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Destiny',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Abby',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Shadow',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Zoey'
];

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, currentAvatar, onUpdateAvatar }) => {
  const [musicMuted, setMusicMuted] = useState(audioManager.isMusicMuted());
  const [sfxMuted, setSfxMuted] = useState(audioManager.isSfxMuted());

  const handleToggleMusic = () => {
    const newVal = audioManager.toggleMusic();
    setMusicMuted(newVal);
  };

  const handleToggleSfx = () => {
    const newVal = audioManager.toggleSfx();
    setSfxMuted(newVal);
  };

  const handleLogout = async () => {
    try {
        await signOut(auth);
        onClose();
    } catch (error) {
        console.error("Erro ao sair:", error);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[pop_0.2s_ease-out]">
      <div className="bg-slate-800 border-2 border-indigo-500 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Configurações</h2>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
            <X className="text-white" size={24} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto hide-scrollbar">
          
          {/* Avatar Selection */}
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
             <div className="flex items-center gap-2 mb-3">
                <User className="text-indigo-400" size={20}/>
                <h3 className="text-white font-bold">Escolha seu Herói</h3>
             </div>
             
             <div className="grid grid-cols-5 gap-2">
                {AVATAR_OPTIONS.map((url, idx) => {
                    const isSelected = currentAvatar === url;
                    return (
                        <button 
                            key={idx}
                            onClick={() => onUpdateAvatar(url)}
                            className={`
                                relative rounded-full overflow-hidden border-2 transition-all aspect-square
                                ${isSelected 
                                    ? 'border-yellow-400 scale-110 shadow-[0_0_10px_rgba(250,204,21,0.5)] z-10' 
                                    : 'border-slate-600 opacity-60 hover:opacity-100 hover:scale-105'
                                }
                            `}
                        >
                            <img src={url} alt="Avatar" className="w-full h-full object-cover bg-slate-700" />
                            {isSelected && (
                                <div className="absolute inset-0 bg-yellow-400/20 flex items-center justify-center">
                                    <Check size={12} className="text-white drop-shadow-md font-bold" strokeWidth={4} />
                                </div>
                            )}
                        </button>
                    )
                })}
             </div>
          </div>

          <div className="w-full h-px bg-white/10 my-1"></div>

          {/* Music Toggle */}
          <button 
            onClick={handleToggleMusic}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${!musicMuted ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-700 border-slate-600'}`}
          >
            <div className="flex items-center gap-3">
              <Music className="text-white" size={24} />
              <span className="font-bold text-white">Música</span>
            </div>
            <div className="font-mono text-sm font-bold text-white/80">
              {musicMuted ? 'OFF' : 'ON'}
            </div>
          </button>

          {/* SFX Toggle */}
          <button 
            onClick={handleToggleSfx}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${!sfxMuted ? 'bg-pink-600 border-pink-400' : 'bg-slate-700 border-slate-600'}`}
          >
            <div className="flex items-center gap-3">
              {!sfxMuted ? <Volume2 className="text-white" size={24} /> : <VolumeX className="text-white" size={24} />}
              <span className="font-bold text-white">Efeitos Sonoros</span>
            </div>
            <div className="font-mono text-sm font-bold text-white/80">
              {sfxMuted ? 'OFF' : 'ON'}
            </div>
          </button>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-red-500/30 bg-red-900/20 text-red-300 transition-all hover:bg-red-600 hover:text-white hover:border-red-500 mt-2"
          >
             <LogOut size={20} />
             <span className="font-bold">Sair da Conta</span>
          </button>

        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          Explode Cores v1.0
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
