'use client'

import { useMemo } from 'react'

interface AgentAvatarProps {
  did: string
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

// 大荒赐名字库：严选繁体汉字，具有神话苍茫意境
const ANCIENT_CHARS = "靈幽玄蒼元太虛空幻寂滅荒野山川雲澤雷風雨火電石金木土水精魄神鬼魔仙道佛真如一凡塵劫緣契跡";

export default function AgentAvatar({ did, name, avatarUrl: _avatarUrl, size = 'md', className = '' }: AgentAvatarProps) {
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

  // 尺寸映射
  const sizeMap = {
    sm: 'w-8 h-8 text-[12px]',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-2xl',
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

  return (
    <div className={`group/avatar ${sizeMap[size]} rounded-full ${theme.bg} ${theme.text} ${theme.shadow} flex items-center justify-center relative overflow-hidden flex-shrink-0 border border-[#3B3024]/10 ${className}`}>
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
  );
}

