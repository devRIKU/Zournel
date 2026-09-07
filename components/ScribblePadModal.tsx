import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Check, Pencil, Eraser, Undo, Sparkles } from './Icons';
import { Button } from './ui/button';

interface ScribblePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  onRemove?: () => void;
  initialScribble?: string;
}

const COLORS = [
  { label: 'Ink', value: '#242424', darkValue: '#EDEDED' },
  { label: 'Terracotta', value: '#C25A38', darkValue: '#E07A5F' },
  { label: 'Sage', value: '#4A7C59', darkValue: '#81B29A' },
  { label: 'Ocean', value: '#3D5A80', darkValue: '#98C1D9' },
  { label: 'Amber', value: '#D48C29', darkValue: '#F2CC8F' },
];

const STROKE_WIDTHS = [
  { label: 'Fine', size: 2 },
  { label: 'Medium', size: 4 },
  { label: 'Bold', size: 8 },
];

export const ScribblePadModal: React.FC<ScribblePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onRemove,
  initialScribble,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0].value);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasContent, setHasContent] = useState<boolean>(Boolean(initialScribble));
  const [history, setHistory] = useState<ImageData[]>([]);

  // Setup canvas size and load initial scribble if provided
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI canvas
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (initialScribble) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasContent(true);
        saveHistoryState();
      };
      img.src = initialScribble;
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
      setHasContent(false);
      setHistory([]);
    }
  }, [isOpen, initialScribble]);

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-15), state]);
    } catch (e) {}
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nextHistory = [...history];
    nextHistory.pop(); // current
    const previous = nextHistory[nextHistory.length - 1];
    setHistory(nextHistory);

    if (previous) {
      ctx.putImageData(previous, 0, 0);
      setHasContent(true);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasContent(false);
    }
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setHasContent(true);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeWidth;
    }

    // Draw single dot in case of single tap
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}

    ctx.closePath();
    setIsDrawing(false);
    saveHistoryState();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasContent(false);
    saveHistoryState();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasContent) {
      if (onRemove) onRemove();
      onClose();
      return;
    }

    // Export trimmed transparent PNG
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="bg-surface rounded-3xl w-full max-w-xl shadow-2xl border border-surface-highlight flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-highlight bg-surface/80">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-accent/15 text-accent rounded-xl">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-primary text-base">Hand-drawn Scribble</h3>
                  <p className="text-[10px] text-secondary font-mono uppercase tracking-wider">Sketch a quick thought or doodle</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {initialScribble && onRemove && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onRemove();
                      onClose();
                    }}
                    className="h-8 px-2.5 text-xs gap-1"
                    title="Remove attached scribble"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Remove</span>
                  </Button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawing Canvas Area */}
            <div className="relative p-4 bg-surface-lowest/70 flex flex-col items-center justify-center">
              <div className="w-full h-72 sm:h-80 relative rounded-2xl border-2 border-dashed border-surface-highlight/80 bg-surface shadow-inner overflow-hidden touch-none cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                  className="w-full h-full block"
                />

                {!hasContent && !isDrawing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-secondary/40 select-none">
                    <Pencil className="w-8 h-8 stroke-1 mb-2 animate-pulse" />
                    <span className="text-xs font-grotesk tracking-widest uppercase">Draw here with mouse or finger</span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls Toolbar */}
            <div className="px-5 py-3 border-t border-surface-highlight bg-surface flex flex-wrap items-center justify-between gap-3">
              {/* Colors */}
              <div className="flex items-center gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => {
                      setSelectedColor(c.value);
                      setIsEraser(false);
                    }}
                    style={{ backgroundColor: c.value }}
                    className={`w-6 h-6 rounded-full transition-transform active:scale-90 ${
                      selectedColor === c.value && !isEraser
                        ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface scale-110'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}

                <div className="h-4 w-px bg-surface-highlight mx-1" />

                {/* Eraser Toggle */}
                <button
                  onClick={() => setIsEraser(!isEraser)}
                  className={`p-1.5 rounded-xl border transition ${
                    isEraser
                      ? 'bg-accent text-accent-fg border-accent'
                      : 'border-surface-highlight text-secondary hover:text-primary hover:bg-surface-highlight'
                  }`}
                  title="Eraser"
                >
                  <Eraser className="w-4 h-4" />
                </button>

                {/* Undo */}
                <button
                  onClick={handleUndo}
                  disabled={history.length <= 1}
                  className="p-1.5 rounded-xl border border-surface-highlight text-secondary hover:text-primary hover:bg-surface-highlight disabled:opacity-30 transition"
                  title="Undo stroke"
                >
                  <Undo className="w-4 h-4" />
                </button>

                {/* Clear */}
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-xl border border-surface-highlight text-secondary hover:text-red-500 hover:bg-red-500/10 transition text-xs font-mono"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Stroke Widths */}
              <div className="flex items-center gap-1 bg-surface-highlight/40 p-0.5 rounded-xl border border-surface-highlight">
                {STROKE_WIDTHS.map((w) => (
                  <button
                    key={w.label}
                    onClick={() => setStrokeWidth(w.size)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                      strokeWidth === w.size && !isEraser
                        ? 'bg-surface text-primary shadow-xs'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3 bg-surface-highlight/20 border-t border-surface-highlight flex items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={!hasContent && !initialScribble}
                className="gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Attach Scribble</span>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
