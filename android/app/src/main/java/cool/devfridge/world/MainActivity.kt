package cool.devfridge.world

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.ClipData
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.View
import android.webkit.*
import android.widget.*
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import androidx.webkit.*
import com.solana.mobilewalletadapter.clientlib.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.io.ByteArrayOutputStream
import java.net.URL
import java.util.Locale
import javax.net.ssl.HttpsURLConnection

class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private lateinit var sender: ActivityResultSender
    private lateinit var wallet: MobileWalletAdapter
    private lateinit var progress: ProgressBar
    private var walletBusy = false
    private var connectedKey: ByteArray? = null
    private var generation = 0
    private var lastHaptic = 0L
    private var pendingRegistrationReturn: BridgePolicy.RegistrationReturn? = null
    private var gameDocumentReady = false
    private val prefs by lazy { getSharedPreferences("mobile", MODE_PRIVATE) }
    private val green = Color.rgb(193, 236, 115)
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingRegistrationReturn = BridgePolicy.registrationReturn(intent?.data?.toString())
        sender = ActivityResultSender(this)
        wallet = MobileWalletAdapter(ConnectionIdentity(
            Uri.parse(BridgePolicy.ORIGIN), Uri.parse("/world/game-v2/favicon.svg"), "DevFridge World"
        )).apply { blockchain = Solana.Mainnet }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(23, 35, 28))
        }
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val safe = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())
            view.setPadding(safe.left, safe.top, safe.right, maxOf(safe.bottom, keyboard.bottom))
            insets
        }
        val toolbar = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL; setPadding(dp(12), 0, dp(6), 0) }
        val title = TextView(this).apply { setText(R.string.toolbar_title); textSize = 14f; setTextColor(green); setTypeface(null, android.graphics.Typeface.BOLD) }
        toolbar.addView(title, LinearLayout.LayoutParams(0, dp(48), 1f).apply { gravity = Gravity.CENTER_VERTICAL })
        title.gravity = Gravity.CENTER_VERTICAL
        val menu = Button(this).apply {
            setText(R.string.menu); textSize = 13f; setTextColor(green); setBackgroundColor(Color.TRANSPARENT)
            contentDescription = "Game options"; setOnClickListener { showMenu() }
        }
        toolbar.addView(menu, LinearLayout.LayoutParams(dp(76), dp(48)))
        root.addView(toolbar)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal)
        root.addView(progress, LinearLayout.LayoutParams(-1, dp(2)))
        web = WebView(this)
        root.addView(web, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)

        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            AlertDialog.Builder(this).setTitle("Update Android System WebView")
                .setMessage("Update Android System WebView from Google Play to use secure wallet connections.")
                .setPositiveButton("Close") { _, _ -> finish() }.setCancelable(false).show()
            return
        }
        web.setBackgroundColor(Color.rgb(23, 35, 28))
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = true
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = false
            userAgentString += " DevFridgeAndroid/0.3.1-beta.1"
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false)
        val handler = WebViewAssetLoader.AssetsPathHandler(this)
        val loader = WebViewAssetLoader.Builder().setDomain("world.devfridge.cool")
            .addPathHandler(BridgePolicy.GAME_PATH) { path -> handler.handle("game/" + path.ifEmpty { "index.html" }) }
            .build()

        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
        WebViewCompat.addWebMessageListener(web, "__dfNativePort", setOf(BridgePolicy.ORIGIN)) { _, message, origin, mainFrame, reply ->
            if (!mainFrame || origin.toString().trimEnd('/') != BridgePolicy.ORIGIN || !BridgePolicy.isGameDocument(web.url)) return@addWebMessageListener
            val raw = message.data ?: return@addWebMessageListener
            if (raw.length > 6_000_000) return@addWebMessageListener
            val req = runCatching { JSONObject(raw) }.getOrNull() ?: return@addWebMessageListener
            val id = req.optString("id")
            if (!id.matches(Regex("[a-zA-Z0-9_-]{1,80}"))) return@addWebMessageListener
            val epoch = generation
            fun respond(data: JSONObject? = null, error: String? = null) {
                if (epoch != generation || isDestroyed || !BridgePolicy.isGameDocument(web.url)) return
                val response = JSONObject().put("id", id)
                if (error != null) response.put("error", error) else response.put("result", data ?: JSONObject())
                if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) reply.postMessage(response.toString())
            }
            val method = req.optString("method")
            if (method in setOf("connect", "signMessage", "disconnect")) {
                if (walletBusy) { respond(error = "Finish the current wallet request first."); return@addWebMessageListener }
                walletBusy = true
                lifecycleScope.launch {
                    try { respond(walletRequest(method, req.optJSONObject("params") ?: JSONObject())) }
                    catch (e: Exception) { respond(error = e.message ?: "The wallet request was not completed.") }
                    finally { walletBusy = false }
                }
            } else {
                try {
                    when (method) {
                        "haptic" -> { haptic(req.optJSONObject("params")?.optString("kind")); respond() }
                        "share" -> { share(req.optJSONObject("params") ?: JSONObject()); respond() }
                        "openRegistration" -> { openRegistration(req.optJSONObject("params")?.optString("id") ?: ""); respond() }
                        else -> respond(error = "Unsupported mobile request.")
                    }
                } catch (e: Exception) { respond(error = e.message ?: "Action unavailable.") }
            }
        }
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val uri = request.url
                if (uri.scheme == "https" && uri.host == "world.devfridge.cool" && uri.path?.startsWith(BridgePolicy.GAME_PATH) == true) {
                    // Missing bundled files fail closed instead of silently loading a newer website script.
                    return loader.shouldInterceptRequest(uri) ?: WebResourceResponse("text/plain", "UTF-8", 404, "Not bundled", emptyMap(), "Asset unavailable".byteInputStream())
                }
                return null
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (!request.isForMainFrame) return true
                if (BridgePolicy.isGameDocument(request.url.toString())) {
                    if (request.url.path == "/world/game-v2") {
                        view.loadUrl(request.url.buildUpon().path(BridgePolicy.GAME_PATH + "index.html").build().toString())
                        return true
                    }
                    return false
                }
                openExternal(request.url.toString()); return true
            }
            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                gameDocumentReady = false
                generation++
                // A new document must authenticate again; no wallet account is silently inherited.
                connectedKey = null
                progress.visibility = View.VISIBLE
            }
            override fun onPageFinished(view: WebView, url: String) {
                progress.visibility = View.GONE
                gameDocumentReady = BridgePolicy.isGameDocument(url)
                deliverRegistrationReturn()
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) Toast.makeText(this@MainActivity, "Unable to open the game. Use Menu → Reload to retry.", Toast.LENGTH_LONG).show()
            }
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                AlertDialog.Builder(this@MainActivity).setTitle("The game needs to restart")
                    .setMessage("Android stopped the graphics process. Your saved collection is kept.")
                    .setPositiveButton("Restart") { _, _ -> recreate() }.setCancelable(false).show()
                return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, value: Int) { progress.progress = value }
            override fun onPermissionRequest(request: PermissionRequest) { request.deny() }
            override fun onCreateWindow(view: WebView, isDialog: Boolean, isUserGesture: Boolean, message: android.os.Message): Boolean {
                if (!isUserGesture) return false
                val popup = WebView(this@MainActivity)
                popup.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                        openExternal(r.url.toString()); v.destroy(); return true
                    }
                }
                (message.obj as WebView.WebViewTransport).webView = popup; message.sendToTarget(); return true
            }
            override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean {
                AlertDialog.Builder(this@MainActivity).setMessage(message).setPositiveButton("OK") { _, _ -> result.confirm() }
                    .setOnCancelListener { result.cancel() }.show(); return true
            }
            override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
                AlertDialog.Builder(this@MainActivity).setMessage(message).setPositiveButton("Continue") { _, _ -> result.confirm() }
                    .setNegativeButton("Cancel") { _, _ -> result.cancel() }.setOnCancelListener { result.cancel() }.show(); return true
            }
            override fun onJsPrompt(view: WebView, url: String, message: String, defaultValue: String?, result: JsPromptResult): Boolean {
                val input = EditText(this@MainActivity).apply { setText(defaultValue) }
                AlertDialog.Builder(this@MainActivity).setMessage(message).setView(input)
                    .setPositiveButton("Continue") { _, _ -> result.confirm(input.text.toString()) }
                    .setNegativeButton("Cancel") { _, _ -> result.cancel() }.setOnCancelListener { result.cancel() }.show(); return true
            }
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("window.DevFridgeMobile?.back() || false") { handled -> if (handled != "true") showMenu() }
            }
        })
        web.loadUrl(BridgePolicy.GAME_URL)
    }

    private suspend fun walletRequest(method: String, params: JSONObject): JSONObject {
        when (method) {
            "connect" -> when (val result = wallet.connect(sender)) {
                is TransactionResult.Success -> {
                    val key = result.authResult.accounts.first().publicKey
                    require(key.size == 32) { "The wallet returned an invalid Solana account." }
                    web.evaluateJavascript("window.DevFridgeMobile?.setSkrPerk(false)", null)
                    connectedKey = key.copyOf()
                    return JSONObject().put("address", BridgePolicy.base58(key)).put("publicKey", Base64.encodeToString(key, Base64.NO_WRAP))
                }
                is TransactionResult.NoWalletFound -> error("Install an MWA-compatible Solana wallet, then try again.")
                is TransactionResult.Failure -> error(result.message)
            }
            "signMessage" -> {
                val expected = connectedKey?.copyOf() ?: error("Connect a Solana wallet first.")
                require(params.optString("address") == BridgePolicy.base58(expected)) { "Your wallet changed. Reconnect first." }
                val encoded = params.optString("message")
                require(encoded.length <= 24_000) { "Message is too large." }
                val bytes = Base64.decode(encoded, Base64.NO_WRAP)
                require(bytes.isNotEmpty() && bytes.size <= BridgePolicy.MAX_MESSAGE_BYTES) { "Invalid message length." }
                when (val result = wallet.transact(sender) { auth ->
                    require(auth.accounts.any { it.publicKey.contentEquals(expected) }) { "Wallet account changed. Reconnect to continue." }
                    signMessagesDetached(arrayOf(bytes), arrayOf(expected))
                }) {
                    is TransactionResult.Success -> {
                        val signature = result.payload.messages.first().signatures.first()
                        require(signature.size == 64) { "The wallet returned an invalid signature." }
                        return JSONObject().put("signature", Base64.encodeToString(signature, Base64.NO_WRAP))
                    }
                    is TransactionResult.NoWalletFound -> error("No compatible wallet is installed.")
                    is TransactionResult.Failure -> error(result.message)
                }
            }
            "disconnect" -> {
                when (val result = wallet.disconnect(sender)) {
                    is TransactionResult.Success -> { connectedKey = null; web.evaluateJavascript("window.DevFridgeMobile?.setSkrPerk(false)", null); return JSONObject() }
                    is TransactionResult.NoWalletFound -> error("Open your wallet to revoke this connection.")
                    is TransactionResult.Failure -> error(result.message)
                }
            }
            else -> error("Unsupported wallet operation.")
        }
    }

    private fun haptic(kind: String?) {
        val now = android.os.SystemClock.elapsedRealtime()
        if (!prefs.getBoolean("haptics", true) || now - lastHaptic < 80) return
        lastHaptic = now
        val feedback = if (kind == "merge" && android.os.Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY
        web.performHapticFeedback(feedback)
    }

    private fun share(params: JSONObject) {
        val text = params.optString("text").take(4000)
        val image = params.optString("image")
        val intent = Intent(Intent.ACTION_SEND).putExtra(Intent.EXTRA_TEXT, text)
        if (image.isNotEmpty()) {
            require(image.length <= 5_600_000) { "This image is too large to share." }
            val bytes = Base64.decode(image, Base64.NO_WRAP)
            require(bytes.size <= 4_000_000 && bytes.take(8).toByteArray().contentEquals(byteArrayOf(-119,80,78,71,13,10,26,10))) { "Only PNG score images can be shared." }
            val directory = File(cacheDir, "shares").apply { mkdirs() }
            // Unique name avoids replacing a file another app is still reading.
            val file = File(directory, "fridge-${System.currentTimeMillis()}.png").apply { writeBytes(bytes) }
            directory.listFiles()?.filter { it != file && System.currentTimeMillis() - it.lastModified() > 86_400_000 }?.forEach { it.delete() }
            val uri = FileProvider.getUriForFile(this, "$packageName.files", file)
            intent.type = "image/png"; intent.putExtra(Intent.EXTRA_STREAM, uri)
            intent.clipData = ClipData.newRawUri("Fridge score", uri)
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        } else intent.type = "text/plain"
        startActivity(Intent.createChooser(intent, "Share your fridge"))
    }

    private fun openExternal(url: String) {
        if (!BridgePolicy.externalHttps(url)) return
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE)) }
            .onFailure { Toast.makeText(this, "No browser is available for this link.", Toast.LENGTH_LONG).show() }
    }

    private fun openRegistration(id: String) {
        require(BridgePolicy.validRegistrationId(id)) { "Invalid registration link." }
        val page = "${BridgePolicy.ORIGIN}/world/mobile-register/index.html?native=1#$id"
        val uri = Uri.parse("https://phantom.app/ul/browse/${Uri.encode(page)}?ref=${Uri.encode(BridgePolicy.ORIGIN)}")
        try {
            // Explicit package: the capability is not sent to an arbitrary browser or intent handler.
            startActivity(Intent(Intent.ACTION_VIEW, uri).setPackage("app.phantom").addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (_: android.content.ActivityNotFoundException) {
            error("Install Phantom from its official store listing, then retry. Your verified score is saved here.")
        }
    }

    private fun showMenu() {
        pauseGame()
        val haptics = prefs.getBoolean("haptics", true)
        val italian = Locale.getDefault().language == "it"
        val items = arrayOf("Return to game", "Share game", if (haptics) "Turn haptics off" else "Turn haptics on", "Game guide", "Reload game", "About this build", "Close app", "Saved scores / Robinhood registration", if (italian) "Regole TopShelf" else "TopShelf rules", if (italian) "Dati su questo dispositivo" else "Data on this device", if (italian) "Verifica SKR · tema Aurora" else "Check SKR · Aurora theme")
        AlertDialog.Builder(this).setTitle("Cold Storage").setItems(items) { _, which ->
            when (which) {
                1 -> share(JSONObject().put("text", "Play Cold Storage on DevFridge World: ${BridgePolicy.ORIGIN}/world/game-v2"))
                2 -> prefs.edit().putBoolean("haptics", !haptics).apply()
                3 -> openExternal("https://docs.devfridge.cool/world")
                4 -> AlertDialog.Builder(this).setTitle("Reload the game?").setMessage("Your current run will end. Your saved collection stays on this device.")
                    .setPositiveButton("Reload") { _, _ -> web.reload() }.setNegativeButton("Cancel", null).show()
                5 -> AlertDialog.Builder(this).setTitle("DevFridge World 0.3.1-beta.1")
                    .setMessage("Bundled Cold Storage v2\nNative Solana Mobile Wallet Adapter, haptics and sharing.\n\nApprove TopShelf with your original Solana wallet, including Seed Vault. Review and pay separately with your Robinhood wallet in Phantom. Completed verified scores are saved for retry. Online access is required.")
                    .setPositiveButton("OK", null).show()
                6 -> AlertDialog.Builder(this).setTitle("Close the game?").setMessage("The current run will end. Saved scores and collection stay on this device.")
                    .setPositiveButton("Close app") { _, _ -> finish() }.setNegativeButton("Keep playing", null).show()
                7 -> web.evaluateJavascript("window.DevFridgeRegistration?.show()", null)
                8 -> showDocument(if (italian) "Regole TopShelf" else "TopShelf rules", "topshelf")
                9 -> showDocument(if (italian) "Dati su questo dispositivo" else "Data on this device", "device-data")
                10 -> confirmSkrCheck()
            }
        }.show()
    }

    private fun confirmSkrCheck() {
        val italian = Locale.getDefault().language == "it"
        val message = if (italian)
            "Con il tuo consenso, DevFridge legge il saldo pubblico del token SKR dell'account Solana selezionato tramite l'RPC pubblico mainnet di Solana. Il provider RPC può vedere l'indirizzo e l'indirizzo IP. Non viene inviata alcuna transazione. Un saldo SKR positivo sblocca solo il tema cosmetico Aurora; non cambia accesso ai personaggi, punteggi verificati o premi. L'RPC pubblico può essere limitato o temporaneamente indisponibile."
        else
            "With your consent, DevFridge reads the selected Solana account's public SKR balance through Solana's public mainnet RPC. The RPC provider can see the wallet address and IP address. No transaction is sent. A positive SKR balance unlocks only the cosmetic Aurora theme; it does not change character access, verified scores or prizes. The public RPC may be rate-limited or temporarily unavailable."
        AlertDialog.Builder(this).setTitle(if (italian) "Verifica il vantaggio SKR" else "Check the SKR perk")
            .setMessage(message)
            .setPositiveButton(if (italian) "Verifica saldo" else "Check balance") { _, _ -> verifySkrPerk() }
            .setNegativeButton(if (italian) "Annulla" else "Cancel", null).show()
    }

    private fun verifySkrPerk() {
        if (walletBusy) { Toast.makeText(this, "Finish the current wallet request first.", Toast.LENGTH_LONG).show(); return }
        walletBusy = true
        lifecycleScope.launch {
            try {
                val key = connectedKey?.copyOf() ?: when (val result = wallet.connect(sender)) {
                    is TransactionResult.Success -> {
                        val selected = result.authResult.accounts.first().publicKey
                        require(selected.size == 32) { "The wallet returned an invalid Solana account." }
                        connectedKey = selected.copyOf(); selected
                    }
                    is TransactionResult.NoWalletFound -> error("Install an MWA-compatible Solana wallet, then try again.")
                    is TransactionResult.Failure -> error(result.message)
                }
                val address = BridgePolicy.base58(key)
                val unlocked = withContext(Dispatchers.IO) { SkrBalance.eligible(address, readSkrAccounts(address)) }
                web.evaluateJavascript("window.DevFridgeMobile?.setSkrPerk($unlocked)", null)
                val italian = Locale.getDefault().language == "it"
                val resultText = if (unlocked)
                    if (italian) "SKR verificato per il wallet selezionato. Il tema cosmetico Aurora è attivo in questa partita." else "SKR verified for the selected wallet. The cosmetic Aurora theme is active for this game session."
                else
                    if (italian) "Nessun saldo SKR positivo trovato per il wallet selezionato. Il gioco resta invariato." else "No positive SKR balance was found for the selected wallet. The game remains unchanged."
                AlertDialog.Builder(this@MainActivity).setTitle(if (unlocked) "Aurora unlocked" else "SKR not found")
                    .setMessage(resultText).setPositiveButton("OK", null).show()
            } catch (e: Exception) {
                val italian = Locale.getDefault().language == "it"
                val fallback = if (italian) "Impossibile verificare SKR adesso. Riprova più tardi; nessun dato di accesso o punteggio è stato modificato." else "SKR could not be checked right now. Try again later; game access and scores were not changed."
                AlertDialog.Builder(this@MainActivity).setTitle("SKR check unavailable")
                    .setMessage(e.message ?: fallback).setPositiveButton("OK", null).show()
            } finally { walletBusy = false }
        }
    }

    private fun readSkrAccounts(address: String): List<SkrBalance.TokenAccount> {
        val connection = (URL("https://api.mainnet.solana.com").openConnection() as HttpsURLConnection).apply {
            requestMethod = "POST"; connectTimeout = 8_000; readTimeout = 12_000; doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }
        try {
            val request = JSONObject().put("jsonrpc", "2.0").put("id", 1).put("method", "getTokenAccountsByOwner")
                .put("params", org.json.JSONArray().put(address).put(JSONObject().put("mint", SkrBalance.MINT))
                    .put(JSONObject().put("encoding", "jsonParsed").put("commitment", "finalized"))).toString()
            connection.outputStream.use { it.write(request.toByteArray(Charsets.UTF_8)) }
            val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
            val bytes = ByteArrayOutputStream()
            stream.use { input ->
                val buffer = ByteArray(8192)
                while (true) {
                    val count = input.read(buffer); if (count < 0) break
                    if (bytes.size() + count > 524_288) error("The Solana RPC response was too large.")
                    bytes.write(buffer, 0, count)
                }
            }
            if (connection.responseCode !in 200..299) error("Solana RPC returned HTTP ${connection.responseCode}. Please retry later.")
            val response = JSONObject(String(bytes.toByteArray(), Charsets.UTF_8))
            if (response.has("error")) error("Solana RPC could not complete the SKR balance check. Please retry later.")
            val values = response.getJSONObject("result").getJSONArray("value")
            return (0 until values.length()).mapNotNull { index ->
                runCatching {
                    val info = values.getJSONObject(index).getJSONObject("account").getJSONObject("data")
                        .getJSONObject("parsed").getJSONObject("info")
                    SkrBalance.TokenAccount(info.getString("mint"), info.getString("owner"), info.getJSONObject("tokenAmount").getString("amount"))
                }.getOrNull()
            }
        } finally { connection.disconnect() }
    }

    private fun showDocument(title: String, document: String) {
        val language = if (Locale.getDefault().language == "it") "it" else "en"
        val body = assets.open("documents/$document-$language.txt").bufferedReader().use { it.readText() }
        val text = TextView(this).apply {
            this.text = body
            textSize = 16f
            setPadding(dp(20), dp(12), dp(20), dp(12))
            setTextIsSelectable(true)
        }
        val scroll = ScrollView(this).apply { addView(text) }
        AlertDialog.Builder(this).setTitle(title).setView(scroll).setPositiveButton("OK", null).show()
    }

    private fun pauseGame() {
        if (::web.isInitialized) web.evaluateJavascript("window.DevFridgeMobile?.pause()", null)
    }
    override fun onPause() {
        pauseGame()
        if (::web.isInitialized) web.onPause()
        CookieManager.getInstance().flush()
        super.onPause()
    }
    override fun onResume() { super.onResume(); if (::web.isInitialized) { web.onResume(); web.evaluateJavascript("window.DevFridgeRegistration?.resume()", null) } }
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingRegistrationReturn = BridgePolicy.registrationReturn(intent.data?.toString())
        deliverRegistrationReturn()
    }
    private fun deliverRegistrationReturn() {
        val pending = pendingRegistrationReturn ?: return
        if (!::web.isInitialized || !gameDocumentReady || !BridgePolicy.isGameDocument(web.url)) return
        pendingRegistrationReturn = null
        // Links carry only identifiers. The page retrieves a server-validated challenge for a locally saved run;
        // no signature or payment occurs until the user reviews and explicitly approves it.
        if (pending.request != null && pending.run != null)
            web.evaluateJavascript("window.DevFridgeRegistration?.receive(${JSONObject.quote(pending.request)},${JSONObject.quote(pending.run)})", null)
        else web.evaluateJavascript("window.DevFridgeRegistration?.show();window.DevFridgeRegistration?.resume()", null)
    }
    override fun onDestroy() { if (::web.isInitialized) { web.stopLoading(); web.destroy() }; super.onDestroy() }
}
