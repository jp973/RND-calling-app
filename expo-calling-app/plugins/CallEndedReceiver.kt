package com.expocallingapp.android

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * CallEndedReceiver
 *
 * Handles call-ended events when the app is fully killed (no React context).
 * expo-callkit-telecom fires a package-internal broadcast for events that
 * can't reach JS (e.g. decline from the native call screen while killed).
 *
 * This receiver picks up the "onCallEnded" event and POSTs a decline
 * notification to our backend so the caller stops ringing immediately.
 */
class CallEndedReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "CallEndedReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val eventName = intent.getStringExtra("eventName") ?: return
        if (eventName != "onCallEnded") return

        val payload = intent.getStringExtra("payload")?.let {
            try { JSONObject(it) } catch (_: Exception) { null }
        } ?: return

        val session = payload.optJSONObject("session") ?: return
        val incomingCall = session.optJSONObject("incomingCallEvent") ?: return
        val serverCallId = incomingCall.optString("serverCallId", "") 
        val metadata = incomingCall.optJSONObject("metadata")

        Log.d(TAG, "Call ended while app killed — serverCallId=$serverCallId")

        // Use goAsync() for the network call so the receiver doesn't get killed
        val pendingResult = goAsync()

        Thread {
            try {
                notifyServerDecline(serverCallId, metadata)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to notify server of decline", e)
            } finally {
                pendingResult.finish()
            }
        }.start()
    }

    private fun notifyServerDecline(serverCallId: String, metadata: JSONObject?) {
        if (serverCallId.isEmpty()) return

        // The server URL would ideally come from SharedPreferences or BuildConfig.
        // For R&D, we read it from metadata if available, or use a hardcoded fallback.
        val serverUrl = metadata?.optString("serverUrl", "") ?: ""
        if (serverUrl.isEmpty()) {
            Log.w(TAG, "No server URL available — cannot notify decline")
            return
        }

        val url = URL("$serverUrl/api/decline")
        val connection = url.openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true

            val body = JSONObject().apply {
                put("serverCallId", serverCallId)
                put("reason", "declined_while_killed")
            }

            connection.outputStream.use { os ->
                os.write(body.toString().toByteArray())
            }

            val responseCode = connection.responseCode
            Log.d(TAG, "Decline notification sent — response=$responseCode")
        } finally {
            connection.disconnect()
        }
    }
}
