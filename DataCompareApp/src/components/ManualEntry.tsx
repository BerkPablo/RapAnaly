import React, { useState } from 'react';
import type { ShotData } from '../types';
import { Target, Plus } from 'lucide-react';

interface ManualEntryProps {
    onAddShot: (shot: ShotData) => void;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ onAddShot }) => {
    const [formData, setFormData] = useState({
        no: '1',
        exitVelocity: '',
        launchAngle: '',
        exitDirection: '',
        distance: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const shot: ShotData = {
            no: parseInt(formData.no) || 0,
            exitVelocity: parseFloat(formData.exitVelocity) || 0,
            launchAngle: parseFloat(formData.launchAngle) || 0,
            exitDirection: parseFloat(formData.exitDirection) || 0,
            distance: parseFloat(formData.distance) || 0,
        };
        onAddShot(shot);
        setFormData(prev => ({
            ...prev,
            no: (parseInt(prev.no) + 1).toString(),
            exitVelocity: '',
            launchAngle: '',
            exitDirection: '',
            distance: ''
        }));
    };

    return (
        <div className="sidebar-card">
            <div className="sidebar-title">
                <Target size={14} className="text-primary" />
                MLM DS MANUAL ENTRY
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="input-group">
                    <div className="input-box">
                        <label>Shot #</label>
                        <input
                            type="number"
                            value={formData.no}
                            onChange={(e) => setFormData({ ...formData, no: e.target.value })}
                            className="input-dark mono"
                            required
                        />
                    </div>
                    <div className="input-box">
                        <label>Total (ft)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.distance}
                            onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                            className="input-dark mono"
                            placeholder="0.0"
                            required
                        />
                    </div>
                </div>

                <div className="input-triple">
                    <div className="input-box">
                        <label>Velo</label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.exitVelocity}
                            onChange={(e) => setFormData({ ...formData, exitVelocity: e.target.value })}
                            className="input-dark mono"
                            placeholder="0.0"
                            required
                        />
                    </div>
                    <div className="input-box">
                        <label>Angle</label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.launchAngle}
                            onChange={(e) => setFormData({ ...formData, launchAngle: e.target.value })}
                            className="input-dark mono"
                            placeholder="0.0"
                            required
                        />
                    </div>
                    <div className="input-box">
                        <label>Dir</label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.exitDirection}
                            onChange={(e) => setFormData({ ...formData, exitDirection: e.target.value })}
                            className="input-dark mono"
                            placeholder="0.0"
                            required
                        />
                    </div>
                </div>

                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                    <Plus size={16} /> Record Shot
                </button>
            </form>
        </div>
    );
};

export default ManualEntry;
