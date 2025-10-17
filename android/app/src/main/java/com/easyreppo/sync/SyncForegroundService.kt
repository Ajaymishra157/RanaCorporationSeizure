package com.ranacorporation.sync

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.content.ContextCompat

class SyncForegroundService : Service() {

    override fun onCreate() {
        super.onCreate()
        // Ensure notification channel exists
        NotificationHelper.ensureChannel(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val title = intent?.getStringExtra("title") ?: "Downloading data"
        val message = intent?.getStringExtra("message") ?: "Starting…"
        val targetScreen = intent?.getStringExtra("targetScreen")

        val notif = NotificationHelper.build(
            this,
            title,
            message,
            0,
            indeterminate = true,
            targetScreen = targetScreen 
        )

        // Start foreground service with persistent notification
        startForeground(NotificationHelper.NOTIF_ID, notif)

        // If app process is killed, service will be recreated only if explicitly restarted
        return START_NOT_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        // Called when app is swiped away or process is killed
        stopSelf()
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        // Clean up notification if service is destroyed
        NotificationHelper.cancel(this)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        fun start(context: Context, title: String, message: String, targetScreen: String) {
            val i = Intent(context, SyncForegroundService::class.java).apply {
                putExtra("title", title)
                putExtra("message", message)
                putExtra("targetScreen", targetScreen) 
            }
            ContextCompat.startForegroundService(context, i)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, SyncForegroundService::class.java))
            NotificationHelper.cancel(context)
        }
    }
}
