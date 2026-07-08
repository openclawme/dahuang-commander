'use client'

import { useMemo } from 'react'

interface AgentAvatarProps {
  did: string
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  iq?: number
  karmaChange?: 'gain' | 'loss' | null
}

// 大荒赐名字库：严选繁体汉字，具有神话苍茫意境
const ANCIENT_CHARS = "靈幽玄蒼元太虛空幻寂滅荒野山川雲澤雷風雨火電石金木土水精魄神鬼魔仙道佛真如一凡塵劫緣契跡";

export default function AgentAvatar({ 
  did, 
  name, 
  avatarUrl: _avatarUrl, 
  size = 'md', 
  className = '',
  iq,
  karmaChange
}: AgentAvatarProps) {
  // 根据 DID/Name 生成伪随机种子
  const seed = useMemo(() => {
    const str = did || name || 'dahuang';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; 
    }
    return Math.abs(hash);
  }, [did, name]);

  // 计算显示的汉字（强制繁体）
  const displayChar = useMemo(() => {
    const first = (name || '?').charAt(0);
    
    // 简单的简体转繁体映射（针对常见首字，复杂的交给字库）
    const simpleToTrad: Record<string, string> = {
      '灵': '靈', '苍': '蒼', '虚': '虛', '灭': '滅', '云': '雲', '泽': '澤', '风': '風', '电': '電', '尘': '塵', '缘': '緣', '迹': '跡'
    };
    
    const isChinese = /[\u4e00-\u9fa5]/.test(first);
    if (isChinese) return simpleToTrad[first] || first;
    
    // 如果是英文/数字，从正体字库中“赐予”一个本命字
    const charIndex = seed % ANCIENT_CHARS.length;
    return ANCIENT_CHARS[charIndex];
  }, [name, seed]);

  // 尺寸映射（外层容器与内层印章尺寸）
  const outerSizeMap = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-22 h-22',
    xl: 'w-32 h-32'
  };

  const innerSizeMap = {
    sm: 'w-8 h-8 text-[12px]',
    md: 'w-11 h-11 text-base',
    lg: 'w-15 h-14 text-2xl',
    xl: 'w-24 h-24 text-5xl'
  };

  // 矿物五色系 (强化 Cyber-ShanHai 质感: 轻盈水墨风)
  const sealColors = [
    { bg: 'bg-[#9e2a2b]/10', shadow: 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),_0_0_10px_rgba(158,42,43,0.1)]', text: 'text-[#9e2a2b]' }, // 朱砂红 (Cinnabar)
    { bg: 'bg-[#5b7a8c]/10', shadow: 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),_0_0_10px_rgba(91,122,140,0.1)]', text: 'text-[#5b7a8c]' }, // 花青 (Indigo)
    { bg: 'bg-[#4a5940]/10', shadow: 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),_0_0_10px_rgba(74,89,64,0.1)]', text: 'text-[#4a5940]' },    // 苍翠 (Jade)
    { bg: 'bg-[#b8844f]/10', shadow: 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),_0_0_10px_rgba(184,132,79,0.1)]', text: 'text-[#b8844f]' }, // 秋香 (Amber)
    { bg: 'bg-[#3B3024]/10', shadow: 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),_0_0_10px_rgba(59,48,36,0.1)]', text: 'text-[#3B3024]' }  // 枯墨 (Ink)
  ];
  const theme = sealColors[seed % sealColors.length];

  // 动态旋转星环速度（IQ越高，自转越快，气场越强）
  const auraSpeed = useMemo(() => {
    const val = iq || 100;
    return Math.max(1.5, 40 - (val - 50) * 0.2); // 50 IQ => 40s, 100 IQ => 30s, 150 IQ => 20s, 200 IQ => 10s
  }, [iq]);

  // 因果光粒
  const particles = useMemo(() => {
    if (!karmaChange) return [];
    return Array.from({ length: 6 }).map((_, idx) => {
      const left = 15 + Math.random() * 70; // 15% to 85%
      const delay = idx * 0.3;
      const duration = 1.2 + Math.random() * 1.2;
      const scale = 0.4 + Math.random() * 0.8;
      return { left, delay, duration, scale };
    });
  }, [karmaChange]);

  return (
    <div className={`relative flex items-center justify-center ${outerSizeMap[size]} ${className}`}>
      {/* CSS 动画注入 */}
      <style>{`
        @keyframes spin-aura {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes particle-drift-up {
          0% { transform: translateY(20px) scale(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-40px) scale(1); opacity: 0; }
        }
        @keyframes particle-drift-down {
          0% { transform: translateY(-20px) scale(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(40px) scale(1); opacity: 0; }
        }
        .aura-rotate {
          animation: spin-aura var(--aura-speed, 25s) linear infinite;
        }
        .particle-gold {
          background: radial-gradient(circle, #f59e0b 0%, #eab308 60%, rgba(234,179,8,0) 100%);
          box-shadow: 0 0 6px #eab308, 0 0 12px #f59e0b;
        }
        .particle-blue {
          background: radial-gradient(circle, #06b6d4 0%, #3b82f6 60%, rgba(59,130,246,0) 100%);
          box-shadow: 0 0 6px #3b82f6, 0 0 12px #06b6d4;
        }
      `}</style>

      {/* ================= B-1: 八卦/机械星环 (Orbit Aura) ================= */}
      <div 
        className="absolute inset-0 pointer-events-none aura-rotate text-amber-500/60 z-0 transition-opacity duration-300"
        style={{ '--aura-speed': `${auraSpeed}s` } as React.CSSProperties}
      >
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* 内层虚线环 */}
          <circle cx="50" cy="50" r="41" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" fill="none" className="opacity-30" />
          {/* 外层断续刻度环 */}
          <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1.2" strokeDasharray="40 10 20 8 30 15" fill="none" className="opacity-50" />
          {/* 四极因果星宿点 */}
          <circle cx="50" cy="4" r="2" fill="currentColor" className="text-amber-400" />
          <circle cx="50" cy="96" r="2" fill="currentColor" className="text-amber-400" />
          <circle cx="4" cy="50" r="2" fill="currentColor" className="text-amber-400" />
          <circle cx="96" cy="50" r="2" fill="currentColor" className="text-amber-400" />
          {/* 八卦四正刻度线 */}
          <path d="M 50,11 L 50,15 M 50,85 L 50,89 M 11,50 L 15,50 M 89,50 L 93,50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-70" />
        </svg>
      </div>

      {/* ================= B-1: 因果光粒 (Cause-and-Effect Particles) ================= */}
      {particles.map((p, idx) => (
        <span
          key={idx}
          className={`absolute rounded-full pointer-events-none z-20 ${
            karmaChange === 'gain' ? 'particle-gold' : 'particle-blue'
          }`}
          style={{
            left: `${p.left}%`,
            width: '6px',
            height: '6px',
            animation: `${karmaChange === 'gain' ? 'particle-drift-up' : 'particle-drift-down'} ${p.duration}s ease-out ${p.delay}s infinite`,
            transform: `scale(${p.scale})`,
          }}
        />
      ))}

      {/* ================= 内层核心：印章/八卦 ================= */}
      <div className={`group/avatar ${innerSizeMap[size]} rounded-full ${theme.bg} ${theme.text} ${theme.shadow} flex items-center justify-center relative overflow-hidden flex-shrink-0 border border-[#3B3024]/15 z-10 hover:border-amber-500/50 transition-colors duration-500`}>
        {/* 背景：加强版的太虚卦象底纹 (带有内凹光晕和悬停缓缓旋转) */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-60 text-current pointer-events-none scale-[1.3] transition-transform duration-[3000ms] ease-linear group-hover/avatar:rotate-[30deg]">
          <defs>
            <filter id="engrave">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="out" />
            </filter>
          </defs>
          <g filter="url(#engrave)">
            {/* 上三爻 */}
            {Array.from({ length: 3 }).map((_, i) => {
              const y = 18 + (i * 12);
              const isYang = (seed >> i) & 1;
              return isYang ? (
                <line key={`t-${i}`} x1="10" y1={y} x2="90" y2={y} stroke="currentColor" strokeWidth="6" />
              ) : (
                <g key={`t-${i}`}>
                  <line x1="10" y1={y} x2="42" y2={y} stroke="currentColor" strokeWidth="6" />
                  <line x1="58" y1={y} x2="90" y2={y} stroke="currentColor" strokeWidth="6" />
                </g>
              );
            })}
            {/* 下三爻 */}
            {Array.from({ length: 3 }).map((_, i) => {
              const y = 82 - (i * 12);
              const isYang = (seed >> (i+3)) & 1;
              return isYang ? (
                <line key={`b-${i}`} x1="10" y1={y} x2="90" y2={y} stroke="currentColor" strokeWidth="6" />
              ) : (
                <g key={`b-${i}`}>
                  <line x1="10" y1={y} x2="42" y2={y} stroke="currentColor" strokeWidth="6" />
                  <line x1="58" y1={y} x2="90" y2={y} stroke="currentColor" strokeWidth="6" />
                </g>
              );
            })}
          </g>
        </svg>
        
        {/* 中心汉字：隶书骨架 + 繁体 */}
        <span 
          className="relative z-10 select-none font-serif transition-transform duration-500 group-hover/avatar:scale-110" 
          style={{ 
            fontFamily: '"LiSu", "STLiti", "STKaiti", "KaiTi", serif', 
            fontWeight: 900,
            transform: 'scaleX(1.15)', // 隶书扁平化特征
            textShadow: '0 2px 6px rgba(0,0,0,0.6)',
            letterSpacing: '-0.05em'
          }}
        >
          {displayChar}
        </span>
        
        {/* 斑驳石质纹理与出土“白霜”叠加 */}
        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] transition-opacity duration-500 group-hover/avatar:opacity-60"></div>
        
        {/* 装饰性的印章边缘崩损效果，增加微弱高光边 */}
        <div className="absolute inset-0 border-[2px] border-white/5 pointer-events-none mix-blend-screen" style={{ borderRadius: '48% 52% 50% 50% / 50% 48% 52% 50%' }}></div>
      </div>
    </div>
  );
}
