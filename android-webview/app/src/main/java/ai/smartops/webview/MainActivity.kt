package ai.smartops.webview

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat

/**
 * JS console.log / errors appear in Logcat with tag [TAG].
 * Filter: adb logcat -s SmartOpsWebView (or pick tag in Android Studio Logcat).
 * Remote debug: Chrome on PC → chrome://inspect → WebView (debug build only).
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    private val requestCamera = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        Log.i(TAG, "CAMERA runtime permission: granted=$granted")
        if (!granted) {
            Toast.makeText(
                this,
                "Camera denied — Face Scan needs camera. Enable it in Settings → Apps.",
                Toast.LENGTH_LONG,
            ).show()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.webview)

        val debuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        if (debuggable) {
            WebView.setWebContentsDebuggingEnabled(true)
            Log.i(TAG, "WebView remote debugging enabled — use chrome://inspect on your PC")
        }

        // Helps video preview + WebGL (TensorFlow.js) in WebView
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return false
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                Log.i(TAG, "onPageStarted: $url")
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                Log.i(TAG, "onPageFinished: $url")
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
                if (request.isForMainFrame) {
                    Log.e(
                        TAG,
                        "Page load error: code=${error.errorCode} desc=${error.description} url=${request.url}",
                    )
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                val r = request ?: return
                val hasCamera = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.CAMERA,
                ) == PackageManager.PERMISSION_GRANTED
                runOnUiThread {
                    if (hasCamera) {
                        Log.i(TAG, "Granting WebView media capture: ${r.resources.joinToString()}")
                        r.grant(r.resources)
                    } else {
                        Log.w(TAG, "Denying WebView capture — no CAMERA runtime permission")
                        r.deny()
                    }
                }
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                val m = consoleMessage ?: return false
                val line = "${m.message()} — ${m.sourceId()}:${m.lineNumber()}"
                when (m.messageLevel()) {
                    ConsoleMessage.MessageLevel.ERROR -> Log.e(TAG, "JS: $line")
                    ConsoleMessage.MessageLevel.WARNING -> Log.w(TAG, "JS: $line")
                    else -> Log.i(TAG, "JS: $line")
                }
                return true
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress == 100 || newProgress % 25 == 0) {
                    Log.d(TAG, "load progress: $newProgress%")
                }
            }
        }

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                safeBrowsingEnabled = true
            }
        }

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            },
        )

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            requestCamera.launch(Manifest.permission.CAMERA)
        }
        loadStartUrl()
    }

    private fun loadStartUrl() {
        val url = getString(R.string.web_app_url).trim()
        val isPlaceholder = url.contains("YOUR-SITE", ignoreCase = true) || !url.startsWith("http")
        if (!isPlaceholder) {
            Log.i(TAG, "Loading URL: $url")
            webView.loadUrl(url)
        } else {
            Log.w(TAG, "web_app_url is still a placeholder — edit res/values/strings.xml")
            webView.loadData(
                "<html><body style='font-family:sans-serif;padding:24px'>" +
                    "<h2>Set your site URL</h2><p>Edit " +
                    "<code>res/values/strings.xml</code> → <b>web_app_url</b> " +
                    "to your HTTPS Netlify (or Firebase Hosting) URL, then rebuild.</p>" +
                    "</body></html>",
                "text/html",
                "UTF-8",
            )
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        private const val TAG = "SmartOpsWebView"
    }
}
