"use client";

import React, { useState, useEffect } from 'react';
import { Info, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalAlertModal() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Save original alert just in case
    const originalAlert = window.alert;

    // Override global window.alert
    window.alert = (message) => {
      // Safely convert any type of message (like Error objects) to a string so React doesn't crash
      let safeMessage = '';
      try {
        if (message instanceof Error) {
          safeMessage = message.message;
        } else if (typeof message === 'object' && message !== null) {
          safeMessage = JSON.stringify(message);
        } else {
          safeMessage = String(message);
        }
      } catch (e) {
        safeMessage = "An alert was triggered, but the message could not be displayed.";
      }

      const id = Date.now().toString() + Math.random().toString(36).substring(7);
      
      // Ensure we only show a max of 3 alerts at a time to prevent spam
      setAlerts((prev) => {
        const newAlerts = [...prev, { id, message: safeMessage }];
        if (newAlerts.length > 3) {
          return newAlerts.slice(newAlerts.length - 3);
        }
        return newAlerts;
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const closeAlert = (id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Background Overlay */}
      <AnimatePresence>
         {alerts.length > 0 && (
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               transition={{ duration: 0.2 }}
               className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm -z-10 pointer-events-auto"
               onClick={() => {
                   // Close the topmost alert when clicking outside
                   if (alerts.length > 0) {
                       closeAlert(alerts[alerts.length - 1].id);
                   }
               }}
            />
         )}
      </AnimatePresence>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <AnimatePresence>
          {alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
              style={{
                zIndex: alerts.length - index
              }}
              className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-2xl rounded-2xl overflow-hidden relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => closeAlert(alert.id)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-blue-50 p-2.5 rounded-2xl ring-1 ring-blue-100">
                    <AlertCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 pt-1 pr-6">
                    <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Notice</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed font-medium">
                      {alert.message}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => closeAlert(alert.id)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-md shadow-blue-600/20"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
