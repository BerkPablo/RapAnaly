import React from 'react';
import { CheckCircle2 } from 'lucide-react';

type SaveSuccessModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export const SaveSuccessModal: React.FC<SaveSuccessModalProps> = ({ isOpen, onClose }) => {
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
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <CheckCircle2 className="text-green-500" size={24} />
                </div>

                <h2 className="text-2xl font-black italic uppercase tracking-wider mb-3 text-white">
                    SESSION SAVED!
                </h2>

                <p className="text-muted text-sm mb-8 leading-relaxed" style={{ color: '#a1a1aa' }}>
                    Your session result has been securely saved to history.
                </p>

                <button
                    onClick={onClose}
                    className="font-bold uppercase tracking-wider"
                    style={{
                        width: '100%',
                        background: '#22c55e',
                        border: 'none',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                        transition: 'all 0.2s'
                    }}
                >
                    OK
                </button>
            </div>
        </div>
    );
};
