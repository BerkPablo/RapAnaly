import { supabase, isSupabaseConfigured } from './supabase';
import type { ShotData, SessionType } from '../types';

export const saveSession = async (
    sessionType: SessionType,
    mlmShots: ShotData[],
    pro2Shots: ShotData[],
    pro3Shots: ShotData[]
) => {
    if (!isSupabaseConfigured) {
        // Fallback to LocalStorage
        const sessionId = crypto.randomUUID();
        const session = { id: sessionId, type: sessionType, date: new Date().toISOString() };

        const sessions = JSON.parse(localStorage.getItem('rap_sessions') || '[]');
        sessions.push(session);
        localStorage.setItem('rap_sessions', JSON.stringify(sessions));

        const hits = [
            ...mlmShots.map(s => ({ ...s, session_id: sessionId, device_type: 'MLM_DS' })),
            ...pro2Shots.map(s => ({ ...s, session_id: sessionId, device_type: 'PRO_2_0' })),
            ...pro3Shots.map(s => ({ ...s, session_id: sessionId, device_type: 'PRO_3_0' })),
        ].map(h => ({
            session_id: h.session_id,
            device_type: h.device_type,
            hit_no: h.no,
            distance_ft: h.distance,
            exit_velocity_mph: h.exitVelocity,
            launch_angle_deg: h.launchAngle,
            direction_deg: h.exitDirection
        }));

        const allHits = JSON.parse(localStorage.getItem('rap_hits') || '[]');
        localStorage.setItem('rap_hits', JSON.stringify([...allHits, ...hits]));

        return session;
    }

    // 1. Create a session record
    const { data: session, error: sError } = await supabase
        .from('sessions')
        .insert([{ type: sessionType, date: new Date().toISOString() }])
        .select()
        .single();

    if (sError) throw sError;

    // 2. Prepare hits for insertion
    const allHits = [
        ...mlmShots.map(s => ({ ...s, session_id: session.id, device_type: 'MLM_DS' })),
        ...pro2Shots.map(s => ({ ...s, session_id: session.id, device_type: 'PRO_2_0' })),
        ...pro3Shots.map(s => ({ ...s, session_id: session.id, device_type: 'PRO_3_0' })),
    ].map(h => ({
        session_id: h.session_id,
        device_type: h.device_type,
        hit_no: h.no,
        distance_ft: h.distance,
        exit_velocity_mph: h.exitVelocity,
        launch_angle_deg: h.launchAngle,
        direction_deg: h.exitDirection
    }));

    if (allHits.length === 0) return session;

    // 3. Insert hits
    const { error: hError } = await supabase
        .from('hits')
        .insert(allHits);

    if (hError) {
        console.error('Error inserting hits:', hError);
        throw hError;
    }

    return session;
};

export const getSessionHits = async (sessionId: string) => {
    if (!isSupabaseConfigured) {
        const allHits = JSON.parse(localStorage.getItem('rap_hits') || '[]');
        return allHits.filter((h: any) => h.session_id === sessionId);
    }

    const { data, error } = await supabase
        .from('hits')
        .select('*')
        .eq('session_id', sessionId)
        .order('hit_no', { ascending: true });

    if (error) {
        console.error('Error fetching session hits:', error);
        throw error;
    }

    return data;
};

export const getSessions = async () => {
    if (!isSupabaseConfigured) {
        return JSON.parse(localStorage.getItem('rap_sessions') || '[]').sort((a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }

    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });

    if (error) throw error;
    return data;
};
