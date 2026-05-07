/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Download, 
  RefreshCw, 
  Image as ImageIcon, 
  ChevronRight, 
  X,
  Loader2,
  ArrowRight
} from 'lucide-react';

// Standard mobile 9:16 aspect ratio
const ASPECT_RATIO = "9:16";

interface Wallpaper {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

export default function App() {
  const [vibe, setVibe] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const generateVariations = async (baseVibe: string, refImg?: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      // Step 1: Get expanded prompts from backend
      const expandRes = await fetch('/api/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibe: baseVibe })
      });
      const { prompts } = await expandRes.json();
      
      const finalPrompts = prompts || [
        `${baseVibe}, professional phone wallpaper`,
        `${baseVibe}, atmospheric, 9:16`,
        `${baseVibe}, minimalist composition`,
        `${baseVibe}, ethereal lighting`
      ];

      // Step 2: Generate 4 images in parallel using backend proxy
      const generationPromises = finalPrompts.map(async (p: string) => {
        const genRes = await fetch('/api/generate-wallpaper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: p, referenceImage: refImg })
        });
        const { url, error: genErr } = await genRes.json();
        if (genErr) throw new Error(genErr);

        return {
          id: crypto.randomUUID(),
          url,
          prompt: p,
          timestamp: Date.now()
        };
      });

      const newWallpapers = await Promise.all(generationPromises);
      setWallpapers(prev => [...newWallpapers, ...prev]);
      setReferenceImage(null);
      
      setTimeout(() => {
        gridRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err: any) {
      console.error(err);
      setError("Failed to generate wallpapers. Check server connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (wallpaper: Wallpaper) => {
    const link = document.createElement('a');
    link.href = wallpaper.url;
    link.download = `vibepaper-${wallpaper.id.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemix = (wallpaper: Wallpaper) => {
    setReferenceImage(wallpaper.url);
    setSelectedWallpaper(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Focus the input if possible or just let the user see the "Remixing" state
  };

  return (
    <div className="min-h-screen px-4 py-8 md:py-16 flex flex-col items-center">
      <div className="atmosphere" />
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="font-serif text-5xl md:text-7xl mb-2 tracking-tight">VibePaper</h1>
        <p className="font-sans text-white/50 text-sm md:text-base uppercase tracking-[0.2em]">
          Transform your vibe into vision
        </p>
      </motion.header>

      {/* Input Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-xl glass p-1 rounded-2xl mb-12 shadow-2xl"
      >
        <div className="relative flex items-center p-2">
          {referenceImage && (
            <div className="absolute -top-12 left-0 flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30">
              <RefreshCw className="w-3 h-3 text-orange-400 rotate-180" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-orange-400">Remixing selected</span>
              <button onClick={() => setReferenceImage(null)} className="ml-1 hover:text-white/80">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          
          <Sparkles className="absolute left-6 w-5 h-5 text-white/30 pointer-events-none" />
          
          <input 
            type="text"
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && vibe && !isGenerating && generateVariations(vibe, referenceImage || undefined)}
            placeholder="Describe your vibe... (e.g. moody neon rain)"
            className="w-full bg-transparent border-none py-4 pl-14 pr-32 focus:ring-0 text-lg placeholder:text-white/20 outline-none"
          />
          
          <button
            onClick={() => generateVariations(vibe, referenceImage || undefined)}
            disabled={!vibe || isGenerating}
            className="absolute right-2 px-6 py-3 rounded-xl bg-white text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 transition-all flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            {!isGenerating && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>

      {error && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20"
        >
          {error}
        </motion.div>
      )}

      {/* Grid Section */}
      {wallpapers.length > 0 && (
        <div ref={gridRef} className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
          <AnimatePresence>
            {wallpapers.map((wp, idx) => (
              <motion.div
                key={wp.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="group relative aspect-[9/16] rounded-xl overflow-hidden glass cursor-pointer"
                onClick={() => setSelectedWallpaper(wp)}
              >
                <img 
                  src={wp.url} 
                  alt={wp.prompt} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                  <ImageIcon className="w-8 h-8 text-white/50" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {wallpapers.length === 0 && !isGenerating && (
        <div className="mt-20 text-center opacity-40 px-10">
          <ImageIcon className="w-12 h-12 mx-auto mb-4" />
          <p className="font-serif italic text-xl">Your dream wallpaper awaits.</p>
          <p className="text-xs uppercase tracking-widest mt-2">Enter a vibe to begin</p>
        </div>
      )}

      {/* Fullscreen Overlay */}
      <AnimatePresence>
        {selectedWallpaper && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          >
            <div 
              className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
              onClick={() => setSelectedWallpaper(null)} 
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative max-w-sm w-full glass-card rounded-[2rem] overflow-hidden flex flex-col"
              style={{ maxHeight: '90vh' }}
            >
              <button 
                onClick={() => setSelectedWallpaper(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/20 transition-all text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative aspect-[9/16] w-full overflow-hidden">
                <img 
                  src={selectedWallpaper.url} 
                  alt={selectedWallpaper.prompt}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="p-6 bg-gradient-to-t from-black to-transparent">
                <p className="text-white/60 text-xs uppercase tracking-widest mb-3">Vibe: {vibe}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleDownload(selectedWallpaper)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-black rounded-2xl font-bold hover:bg-white/90 transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                  <button 
                    onClick={() => handleRemix(selectedWallpaper)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 glass text-white rounded-2xl font-bold hover:bg-white/20 transition-all"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Remix
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continuous Loading indicator */}
      {isGenerating && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-10 px-6 py-3 glass rounded-full flex items-center gap-3"
        >
          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
          <span className="text-sm font-medium tracking-wide">Crafting your variations...</span>
        </motion.div>
      )}
    </div>
  );
}
