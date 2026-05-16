import { useEffect, useCallback } from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';

/**
 * Hook for browser notifications when commands need approval
 * Uses the shared WebSocket context instead of creating a duplicate connection
 */
const useCommandNotifications = () => {
    const { subscribe, isConnected } = useWebSocketContext();

    // Request notification permission
    const requestPermission = useCallback(async () => {
        if (!('Notification' in window)) {
            console.log('Browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }, []);

    // Show notification
    const showNotification = useCallback((title, options = {}) => {
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                tag: 'command-approval',
                renotify: true,
                requireInteraction: true,
                ...options
            });

            notification.onclick = () => {
                window.focus();
                window.location.href = '/commands';
                notification.close();
            };

            // Auto close after 30s
            setTimeout(() => notification.close(), 30000);
        }
    }, []);

    // Request permission on mount
    useEffect(() => {
        requestPermission();
    }, [requestPermission]);

    // Subscribe to command_pending_approval events via shared WebSocket
    useEffect(() => {
        if (!isConnected) return;

        const unsubscribe = subscribe('command_pending_approval', (data) => {
            showNotification('Command Approval Required', {
                body: `${data.assessment_name || 'Assessment'}\n${data.command?.substring(0, 60)}`,
            });
        });

        return unsubscribe;
    }, [subscribe, showNotification, isConnected]);

    return { requestPermission };
};

export default useCommandNotifications;
