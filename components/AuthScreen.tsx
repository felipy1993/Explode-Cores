
import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { PlayerInventory } from '../types';
import { User, Mail, Lock, LogIn, Sparkles, AlertCircle, Eye, EyeOff, Flame, Droplets, Leaf, Star } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface AuthScreenProps {
  defaultInventory: PlayerInventory;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ defaultInventory }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Email or Username
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedIdentifier = localStorage.getItem('savedLoginIdentifier');
    if (savedIdentifier) {
      setLoginIdentifier(savedIdentifier);
      setRememberMe(true);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- TENTATIVA DE FULLSCREEN AUTOMÁTICO ---
    try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            // O navegador exige que isso seja síncrono ou logo após a interação do usuário
            await document.documentElement.requestFullscreen().catch((err) => {
                console.log("Fullscreen bloqueado ou cancelado pelo usuário:", err);
            });
        }
    } catch (err) {
        // Ignora erros de fullscreen para não travar o login
        console.log("Erro ao tentar fullscreen:", err);
    }
    // -------------------------------------------

    setLoading(true);
    setError('');
    audioManager.playSfx('ui');

    try {
      if (isLogin) {
        let finalIdentifier = loginIdentifier.trim();
        let finalEmail = finalIdentifier;
        
        if (!finalIdentifier.includes('@')) {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("displayName", "==", finalIdentifier), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("Usuário não encontrado com este nome.");
            }
            finalEmail = querySnapshot.docs[0].data().email;
        }

        await signInWithEmailAndPassword(auth, finalEmail, password);

        if (rememberMe) {
            localStorage.setItem('savedLoginIdentifier', loginIdentifier);
        } else {
            localStorage.removeItem('savedLoginIdentifier');
        }

      } else {
        const finalUsername = username.trim();
        const finalEmail = email.trim();

        if (finalUsername.length < 3) throw new Error("O nome deve ter pelo menos 3 letras.");
        if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
        
        const usersRef = collection(db, "users");
        const qUsername = query(usersRef, where("displayName", "==", finalUsername), limit(1));
        const usernameCheck = await getDocs(qUsername);
        
        if (!usernameCheck.empty) {
            throw new Error("Este nome de usuário já está em uso.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: finalUsername });

        await setDoc(doc(db, "users", user.uid), {
          displayName: finalUsername,
          email: finalEmail,
          unlockedLevel: 1,
          totalScore: 0,
          inventory: defaultInventory,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Ocorreu um erro desconhecido.";
      if (err.code === 'auth/invalid-email') msg = "O e-mail digitado é inválido.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = "Credenciais incorretas.";
      if (err.code === 'auth/wrong-password') msg = "Senha incorreta.";
      if (err.code === 'auth/email-already-in-use') msg = "E-mail já cadastrado.";
      if (err.code === 'auth/weak-password') msg = "Senha muito fraca.";
      if (err.message && !err.code) msg = err.message;

      setError(msg);
      audioManager.playSfx('lose');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
      setIsLogin(!isLogin);
      setError('');
      setPassword('');
      audioManager.playSfx('ui');
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden bg-[#0f0518]">
      
      {/* --- BACKGROUND MAGIC --- */}
      <div className="absolute inset-0 z-0">
         {/* Base Image with Overlay */}
         <img 
            src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2568&auto=format&fit=crop" 
            alt="Magic Background" 
            className="w-full h-full object-cover opacity-40 blur-sm"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-[#0f0518] via-[#1e1b4b]/80 to-[#0f0518]/90"></div>
         
         {/* Animated Orbs/Runes */}
         <div className="absolute top-1/4 left-1/4 animate-float opacity-30">
             <Flame size={64} className="text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
         </div>
         <div className="absolute bottom-1/4 right-1/4 animate-[wiggle_4s_infinite] opacity-30" style={{ animationDelay: '1s' }}>
             <Droplets size={56} className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
         </div>
         <div className="absolute top-1/3 right-10 animate-float opacity-20" style={{ animationDelay: '2s' }}>
             <Leaf size={48} className="text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
         </div>
         
         {/* Particle Dust */}
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150"></div>
      </div>

      {/* --- MAIN CARD --- */}
      <div className="relative w-full max-w-[420px] bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl flex flex-col items-center animate-[pop_0.6s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden">
        
        {/* Glow Effect Top */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]"></div>

        {/* LOGO AREA */}
        <div className="relative mb-6 flex flex-col items-center">
            <div className="relative group cursor-pointer mb-2">
                <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
                <div className="relative bg-gradient-to-br from-amber-400 to-orange-600 p-4 rounded-2xl shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 border-2 border-white/20">
                    <Sparkles size={40} className="text-white fill-white animate-pulse" />
                </div>
                {/* Tiny stars around logo */}
                <Star size={16} className="absolute -top-2 -right-2 text-yellow-300 animate-spin-slow" fill="currentColor" />
                <Star size={12} className="absolute -bottom-1 -left-2 text-yellow-300 animate-pulse" fill="currentColor" style={{animationDelay: '0.5s'}} />
            </div>
            
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-300 tracking-tight drop-shadow-sm text-center leading-none mt-2">
                EXPLODE
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-orange-500 text-5xl drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
                    CORES
                </span>
            </h1>
        </div>

        {/* TOGGLE TABS */}
        <div className="flex w-full bg-slate-950/50 p-1 rounded-2xl mb-6 relative border border-white/5">
            <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-700/80 rounded-xl shadow-md transition-all duration-300 ease-out border border-white/10 ${isLogin ? 'left-1' : 'left-[calc(50%+4px)]'}`}
            ></div>
            <button 
                onClick={() => !isLogin && toggleMode()}
                className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors duration-200 ${isLogin ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
                Entrar
            </button>
            <button 
                onClick={() => isLogin && toggleMode()}
                className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors duration-200 ${!isLogin ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
                Criar Conta
            </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleAuth} className="w-full flex flex-col gap-3 relative z-10">
          
          {/* USERNAME (Signup Only) */}
          <div className={`transition-all duration-300 overflow-hidden ${!isLogin ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                    <User size={20} />
                </div>
                <input 
                    type="text" 
                    placeholder="Nome de Herói" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700/50 group-hover:border-slate-600 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                    required={!isLogin}
                />
              </div>
          </div>

          {/* EMAIL / LOGIN IDENTIFIER */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                 {isLogin ? <User size={20} /> : <Mail size={20} />}
            </div>
            <input 
                type={isLogin ? "text" : "email"}
                placeholder={isLogin ? "Nome ou E-mail" : "Seu melhor E-mail"}
                value={isLogin ? loginIdentifier : email}
                onChange={(e) => isLogin ? setLoginIdentifier(e.target.value) : setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700/50 group-hover:border-slate-600 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                required
            />
          </div>

          {/* PASSWORD */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                <Lock size={20} />
            </div>
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Sua senha secreta" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700/50 group-hover:border-slate-600 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
              required
            />
            <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-300 transition-colors focus:outline-none p-1"
            >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* REMEMBER ME */}
          <div className={`flex items-center gap-2 px-1 transition-all duration-300 overflow-hidden ${isLogin ? 'max-h-10 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                <div className="relative flex items-center">
                    <input 
                        type="checkbox" 
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-600 bg-slate-900/50 checked:border-indigo-500 checked:bg-indigo-500 transition-all"
                    />
                    <CheckIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <label htmlFor="rememberMe" className="text-sm text-slate-400 cursor-pointer hover:text-slate-200 transition-colors select-none font-medium">
                    Lembrar de mim
                </label>
            </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3 text-red-200 text-xs animate-shake mt-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button 
            type="submit" 
            disabled={loading}
            className="group relative mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-[0_4px_0_rgb(55,48,163)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
             {/* Shine effect */}
             <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-[200%] group-hover:animate-[shine_1s_ease-in-out]"></div>
            
            {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
                <>
                    {isLogin ? <LogIn size={20} className="group-hover:translate-x-1 transition-transform" /> : <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />}
                    <span className="tracking-wide text-lg">{isLogin ? "JOGAR AGORA" : "CRIAR CONTA"}</span>
                </>
            )}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-500 font-medium tracking-wide">
             Reino das Runas v1.0 • Match-3 Adventure
        </p>

      </div>
    </div>
  );
};

// Simple Check Icon component for the custom checkbox
const CheckIcon = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export default AuthScreen;
