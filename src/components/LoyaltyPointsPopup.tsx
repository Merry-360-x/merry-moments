import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, X } from "lucide-react";

interface LoyaltyPointsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  points: number;
  reason?: string;
  totalPoints?: number;
}

export function LoyaltyPointsPopup({
  isOpen,
  onClose,
  points,
  reason = "completing your profile",
  totalPoints,
}: LoyaltyPointsPopupProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto close after 4 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/90 dark:to-orange-950/90 
                       border border-amber-200 dark:border-amber-800 rounded-2xl shadow-2xl 
                       p-6 max-w-xs w-full pointer-events-auto backdrop-blur-sm"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
            >
              <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>

            {/* Confetti effect */}
            {showConfetti && (
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      opacity: 1, 
                      scale: 0,
                      x: "50%",
                      y: "50%"
                    }}
                    animate={{ 
                      opacity: 0, 
                      scale: 1,
                      x: `${50 + (Math.random() - 0.5) * 100}%`,
                      y: `${50 + (Math.random() - 0.5) * 100}%`
                    }}
                    transition={{ duration: 1, delay: i * 0.05 }}
                    className="absolute w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: ['#fbbf24', '#f59e0b', '#d97706', '#c2410c'][i % 4]
                    }}
                  />
                ))}
              </div>
            )}

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 
                               flex items-center justify-center shadow-lg">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: 2, duration: 0.5 }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </motion.div>
              </motion.div>
            </div>

            {/* Content */}
            <div className="text-center">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-amber-700 dark:text-amber-300 mb-1"
              >
                Congratulations! 🎉
              </motion.p>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-1"
              >
                +{points} Points
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-amber-600 dark:text-amber-400"
              >
                Earned for {reason}
              </motion.p>
              {totalPoints !== undefined && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800"
                >
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Total balance: <span className="font-semibold">{totalPoints} points</span>
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
