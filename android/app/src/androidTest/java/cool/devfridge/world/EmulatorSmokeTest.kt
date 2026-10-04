package cool.devfridge.world

import android.webkit.WebView
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** No age submission, production eligibility bypass, private key, or financial transaction. */
@RunWith(AndroidJUnit4::class)
class EmulatorSmokeTest {
    @Test fun coldNativeSigningReturnNeverApprovesAnUnknownRun() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val intent = android.content.Intent(context, MainActivity::class.java).apply {
            action = android.content.Intent.ACTION_VIEW
            data = android.net.Uri.parse("devfridgeworld://registration?run=0x${"ef".repeat(32)}&request=${"b".repeat(43)}")
        }
        ActivityScenario.launch<MainActivity>(intent).use { scenario ->
            val deadline = System.currentTimeMillis() + 45000
            var visible = "false"
            while (visible != "true" && System.currentTimeMillis() < deadline) {
                visible = js(scenario,"!!document.querySelector('.native-score-dialog[open]')")
                if (visible != "true") Thread.sleep(200)
            }
            assertEquals("The cold-start return must reach the bundled game", "true", visible)
            assertTrue(js(scenario,"document.querySelector('.native-score-dialog[open]').textContent").contains("Your verified scores"))
            assertEquals("No unknown run may become a signing request", "false", js(scenario,"document.querySelector('.native-score-dialog[open]').textContent.includes('Review and sign')"))
            js(scenario,"document.querySelector('.native-score-dialog[open]').close()")
            // ActivityScenario adds CLEAR_TASK to its launch intent; a browser return must not inherit it.
            scenario.onActivity { activity -> activity.startActivity(android.content.Intent(intent).setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP)) }
            val warmDeadline = System.currentTimeMillis() + 10000
            var reopened = "false"
            while (reopened != "true" && System.currentTimeMillis() < warmDeadline) {
                reopened = js(scenario,"!!document.querySelector('.native-score-dialog[open]')")
                if (reopened != "true") Thread.sleep(100)
            }
            assertEquals("Warm return must also reach the existing game", "true", reopened)
        }
    }
    @android.annotation.TargetApi(29)
    @androidx.test.filters.SdkSuppress(minSdkVersion = 29)
    @Test fun rulesAreAccessibleBeforeWalletConnection() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                fun findOptions(view: View): Button? {
                    if (view is Button && view.contentDescription == "Game options") return view
                    if (view is ViewGroup) for (i in 0 until view.childCount) findOptions(view.getChildAt(i))?.let { return it }
                    return null
                }
                assertNotNull(findOptions(activity.window.decorView))
                findOptions(activity.window.decorView)!!.performClick()
            }
            val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
            val deadline = System.currentTimeMillis() + 10000
            var rules = emptyList<android.view.accessibility.AccessibilityNodeInfo>()
            while (rules.isEmpty() && System.currentTimeMillis() < deadline) {
                rules = automation.rootInActiveWindow?.findAccessibilityNodeInfosByText("TopShelf") ?: emptyList()
                if (rules.isEmpty()) Thread.sleep(100)
            }
            assertTrue("TopShelf rules should be in the native menu before login", rules.isNotEmpty())
            // Dispatch the visible native ListView item; accessibility coordinates can be stale after layout.
            assertTrue("The rules menu row must be visible", rules.first().isVisibleToUser)
            scenario.onActivity {
                fun findList(view: View): android.widget.ListView? {
                    if (view is android.widget.ListView) return view
                    if (view is ViewGroup) for (i in 0 until view.childCount) findList(view.getChildAt(i))?.let { return it }
                    return null
                }
                val menu = android.view.inspector.WindowInspector.getGlobalWindowViews().mapNotNull(::findList).first()
                val position = (0 until menu.adapter.count).first { menu.adapter.getItem(it).toString().contains("TopShelf") }
                assertTrue(menu.performItemClick(menu.getChildAt(position - menu.firstVisiblePosition), position, menu.adapter.getItemId(position)))
            }
            val until = System.currentTimeMillis() + 10000
            var content = ""
            fun textOf(node: android.view.accessibility.AccessibilityNodeInfo?): String {
                if (node == null) return ""
                return node.text.toString() + (0 until node.childCount).joinToString(" ") { textOf(node.getChild(it)) }
            }
            while (!content.contains("unreserved") && !content.contains("non riservati") && System.currentTimeMillis() < until) {
                content = textOf(automation.rootInActiveWindow)
                Thread.sleep(100)
            }
            assertTrue("Rules must explain the owner safety control", content.contains("unreserved") || content.contains("non riservati"))
            assertTrue("Rules must disclose claim closure", content.contains("minimum claim") || content.contains("durata minima"))
            val screenshot = automation.takeScreenshot()
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            java.io.File(context.getExternalFilesDir(null), "topshelf-rules.png").outputStream().use {
                screenshot.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it)
            }
            screenshot.recycle()
        }
    }
    private fun js(scenario: ActivityScenario<MainActivity>, script: String): String {
        val done = CountDownLatch(1); var result = ""
        scenario.onActivity { activity ->
            val field = MainActivity::class.java.getDeclaredField("web").apply { isAccessible = true }
            (field.get(activity) as WebView).evaluateJavascript(script) { result = it; done.countDown() }
        }
        assertTrue("WebView JS callback timed out", done.await(15, TimeUnit.SECONDS))
        return result
    }
    @Test fun bundledGameNativeBridgeAndRenderer() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val deadline = System.currentTimeMillis() + 45000
            while (js(scenario,"!!window.DevFridgeRegistration") != "true" && System.currentTimeMillis() < deadline) Thread.sleep(250)
            assertEquals("true", js(scenario,"!!window.DevFridgeMobile && !!window.DevFridgeRegistration"))
            assertEquals("\"https://world.devfridge.cool\"",js(scenario,"location.origin"))
            assertEquals("true",js(scenario,"(()=>{const c=document.createElement('canvas');const gl=c.getContext('webgl2');if(!gl)return false;gl.clearColor(0.2,0.5,0.1,1);gl.clear(gl.COLOR_BUFFER_BIT);const p=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return p[1]>100&&p[3]===255})()"))
            assertEquals("true",js(scenario,"(()=>{window.dispatchEvent(new CustomEvent('wallet-standard:app-ready',{detail:{register:w=>window.__testWallet=w}}));return window.__testWallet.chains[0]==='solana:mainnet'})()"))
            assertEquals("true",js(scenario,"(()=>{window.DevFridgeRegistration.show();return document.querySelector('.native-score-dialog').open})()"))
            assertTrue(js(scenario,"document.querySelector('.native-score-dialog').textContent").contains("Your verified scores"))
            // Invoking a return URI is only navigation; no forged 'success' can mark a score registered.
            assertEquals("true",js(scenario,"(()=>{document.querySelector('.native-score-dialog').close();return !document.querySelector('.native-score-dialog').open})()"))
        }
    }
    @Test fun walletDiscoveryAndMissingWalletRecovery() {
        val expected=InstrumentationRegistry.getArguments().getString("walletMode")?:"missing"
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val deadline=System.currentTimeMillis()+45000
            while(js(scenario,"!!window.DevFridgeMobile")!="true"&&System.currentTimeMillis()<deadline)Thread.sleep(250)
            js(scenario,"window.dispatchEvent(new CustomEvent('wallet-standard:app-ready',{detail:{register:w=>window.__testWallet=w}}));window.__walletResult='pending';window.__testWallet.features['standard:connect'].connect().then(r=>window.__walletResult='connected:'+r.accounts[0].address).catch(e=>window.__walletResult='error:'+e.message)")
            if(expected=="missing"){
                val until=System.currentTimeMillis()+20000
                var result=js(scenario,"window.__walletResult")
                while(result.contains("pending")&&System.currentTimeMillis()<until){Thread.sleep(250);result=js(scenario,"window.__walletResult")}
                assertTrue("Expected actionable missing-wallet result: $result",result.contains("MWA-compatible"))
                assertEquals("true",js(scenario,"!!window.DevFridgeMobile"))
            } else {
                // Observe the official mock's activity. Authentication remains a manual test step.
                val until=System.currentTimeMillis()+20000
                var packageName=""
                while(packageName!="com.solana.mwallet"&&System.currentTimeMillis()<until){
                    packageName=InstrumentationRegistry.getInstrumentation().uiAutomation.rootInActiveWindow?.packageName?.toString()?:""
                    Thread.sleep(250)
                }
                assertEquals("Official Mock MWA Wallet should receive the association", "com.solana.mwallet",packageName)
            }
        }
    }
    @Test fun registrationRejectsInvalidLinksAndExplainsMissingPhantom() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val deadline=System.currentTimeMillis()+45000
            while(js(scenario,"!!window.DevFridgeMobile")!="true"&&System.currentTimeMillis()<deadline)Thread.sleep(250)
            fun outcome(id:String):String {
                js(scenario,"window.__handoffResult='pending';window.DevFridgeMobile.openRegistration('$id').then(()=>window.__handoffResult='opened').catch(e=>window.__handoffResult=e.message)")
                val until=System.currentTimeMillis()+10000
                var result=js(scenario,"window.__handoffResult")
                while(result.contains("pending")&&System.currentTimeMillis()<until){Thread.sleep(100);result=js(scenario,"window.__handoffResult")}
                return result
            }
            assertTrue(outcome("../../attacker").contains("Invalid registration link"))
            assertTrue(outcome("a".repeat(43)).contains("Install Phantom"))
        }
    }
}
