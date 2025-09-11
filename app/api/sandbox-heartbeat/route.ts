import { NextResponse } from 'next/server';
import { appConfig } from '@/config/app.config';

export async function POST() {
  try {
    if (!global.activeSandbox) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active sandbox' 
      }, { status: 404 });
    }

    // Refresh the sandbox timeout to keep it alive
    if (typeof global.activeSandbox.setTimeout === 'function') {
      await global.activeSandbox.setTimeout(appConfig.e2b.timeoutMs);
      console.log(`[sandbox-heartbeat] Extended sandbox timeout to ${appConfig.e2b.timeoutMinutes} minutes`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sandbox timeout refreshed',
      timeoutMinutes: appConfig.e2b.timeoutMinutes
    });

  } catch (error) {
    console.error('[sandbox-heartbeat] Failed to refresh timeout:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to refresh sandbox timeout' 
    }, { status: 500 });
  }
}