import React from 'react';
import { RotateCcw } from 'lucide-react';

type ResetConfirmationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

export const ResetConfirmationModal: React.FC<ResetConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div
                className="glass-card"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#09090b',
                    border: '1px solid #27272a',
                    padding: '2.5rem',
                    width: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <RotateCcw className="text-red-500" size={24} />
                </div>

                <h2 className="text-2xl font-black italic uppercase tracking-wider mb-3 text-white">
                    RESET DATA?
                </h2>

                <p className="text-muted text-sm mb-8 leading-relaxed" style={{ color: '#a1a1aa' }}>
                    Session compare üzerindeki datalarınız resetlenecek.
                </p>

                <div className="flex gap-4" style={{ justifyContent: 'center', width: '100%' }}>
                    <button
                        onClick={onClose}
                        className="font-bold uppercase tracking-wider"
                        style={{
                            background: '#18181b',
                            border: '1px solid #27272a',
                            color: '#e4e4e7',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            minWidth: '100px'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="font-bold uppercase tracking-wider"
                        style={{
                            background: '#ef4444',
                            border: 'none',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                            transition: 'all 0.2s',
                            minWidth: '100px'
                        }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};
