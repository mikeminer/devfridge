package cool.devfridge.world

import android.app.AlertDialog
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.Button
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Captures existing app UI only. No fake wallet, eligibility, scores, or network responses. */
@RunWith(AndroidJUnit4::class)
class StoreScreenshotsTest {
    @Test fun capturePublicScreens() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        fun dismissSystemUiAnr() {
            val root = instrumentation.uiAutomation.rootInActiveWindow ?: return
            if (root.findAccessibilityNodeInfosByText("System UI isn't responding").isNotEmpty()) {
                val close = root.findAccessibilityNodeInfosByText("Close app").firstOrNull()
                var target = close
                while (target != null && !target.isClickable) target = target.parent
                target?.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK)
                Thread.sleep(2500)
            }
            assertTrue("System ANR must not cover a store capture", instrumentation.uiAutomation.rootInActiveWindow?.findAccessibilityNodeInfosByText("isn't responding")?.isEmpty() != false)
        }
        dismissSystemUiAnr()
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            fun js(script: String): String {
                val latch = CountDownLatch(1)
                var result = ""
                scenario.onActivity { activity ->
                    val field = MainActivity::class.java.getDeclaredField("web").apply { isAccessible = true }
                    (field.get(activity) as WebView).evaluateJavascript(script) { result = it; latch.countDown() }
                }
                assertTrue(latch.await(15, TimeUnit.SECONDS))
                return result
            }
            val until = System.currentTimeMillis() + 45000
            while (js("!!window.DevFridgeRegistration") != "true" && System.currentTimeMillis() < until) Thread.sleep(200)
            assertTrue(js("!!window.DevFridgeRegistration") == "true")
            fun capture(name: String) {
                dismissSystemUiAnr()
                instrumentation.waitForIdleSync()
                Thread.sleep(1000)
                val bitmap = instrumentation.uiAutomation.takeScreenshot()
                assertTrue("Capture must be portrait 9:16", bitmap.width * 16 == bitmap.height * 9)
                File(instrumentation.targetContext.getExternalFilesDir(null), name).outputStream().use {
                    bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it)
                }
                bitmap.recycle()
            }
            Thread.sleep(5000)
            assertTrue("Server TLS must succeed before capturing", !js("document.body.innerText").contains("Cannot connect securely"))
            capture("01-welcome.png")
            scenario.onActivity { activity ->
                fun find(view: View): Button? {
                    if (view is Button && view.contentDescription == "Game options") return view
                    if (view is ViewGroup) for (i in 0 until view.childCount) find(view.getChildAt(i))?.let { return it }
                    return null
                }
                find(activity.window.decorView)!!.performClick()
            }
            capture("02-native-options.png")
        }
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            dismissSystemUiAnr()
            var opened = false
            val until = System.currentTimeMillis() + 45000
            while (!opened && System.currentTimeMillis() < until) {
                val latch = CountDownLatch(1)
                scenario.onActivity { activity ->
                    val field = MainActivity::class.java.getDeclaredField("web").apply { isAccessible = true }
                    (field.get(activity) as WebView).evaluateJavascript("(()=>{window.DevFridgeRegistration?.show();return !!document.querySelector('.native-score-dialog[open]')})()") { opened = it == "true"; latch.countDown() }
                }
                assertTrue(latch.await(10,TimeUnit.SECONDS))
                Thread.sleep(200)
            }
            assertTrue("Saved score dialog must be open", opened)
            dismissSystemUiAnr()
            instrumentation.waitForIdleSync()
            Thread.sleep(1500)
            val bitmap = instrumentation.uiAutomation.takeScreenshot()
            File(instrumentation.targetContext.getExternalFilesDir(null), "03-saved-scores.png").outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,it) }
            bitmap.recycle()
        }
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            dismissSystemUiAnr()
            Thread.sleep(2000)
            scenario.onActivity { activity ->
                MainActivity::class.java.getDeclaredMethod("showDocument", String::class.java, String::class.java).apply { isAccessible = true }.invoke(activity, "TopShelf rules", "topshelf")
            }
            instrumentation.waitForIdleSync()
            Thread.sleep(1000)
            val bitmap = instrumentation.uiAutomation.takeScreenshot()
            File(instrumentation.targetContext.getExternalFilesDir(null), "04-topshelf-rules.png").outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,it) }
            bitmap.recycle()
        }
    }
}
