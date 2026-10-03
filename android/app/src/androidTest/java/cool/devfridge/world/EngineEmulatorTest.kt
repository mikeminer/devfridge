package cool.devfridge.world

import android.webkit.*
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class EngineEmulatorTest {
    @Test fun originalRapierPhysicsAndThreeRendererOffline() {
        val instrumentation=InstrumentationRegistry.getInstrumentation()
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            lateinit var fixture:WebView
            scenario.onActivity { activity ->
                fixture=WebView(activity)
                fixture.settings.javaScriptEnabled=true
                fixture.webViewClient=object:WebViewClient(){
                    override fun shouldInterceptRequest(view:WebView,request:WebResourceRequest):WebResourceResponse {
                        return if(request.url.toString()=="https://fixture.invalid/fixture.js")
                            WebResourceResponse("application/javascript","UTF-8",instrumentation.context.assets.open("physics-fixture.js"))
                        else WebResourceResponse("text/plain","UTF-8",404,"Offline fixture",emptyMap(),"Network disabled".byteInputStream())
                    }
                }
                activity.setContentView(fixture)
                fixture.loadDataWithBaseURL("https://fixture.invalid/","<html><body><p>OFFLINE ENGINE TEST — not a ranked run</p><script src='/fixture.js'></script></body></html>","text/html","UTF-8",null)
            }
            var result="null";val deadline=System.currentTimeMillis()+45000
            while(result=="null"&&System.currentTimeMillis()<deadline){
                val done=CountDownLatch(1)
                instrumentation.runOnMainSync { fixture.evaluateJavascript("window.fixtureResult || null"){result=it;done.countDown()} }
                assertTrue(done.await(10,TimeUnit.SECONDS));if(result=="null")Thread.sleep(250)
            }
            android.util.Log.i("DevFridgeEngineTest",result)
            assertTrue("Original engine fixture: $result",result.contains("\"ok\":true"))
            assertTrue(result.contains("\"score\":20"))
            instrumentation.runOnMainSync{fixture.destroy()}
        }
    }
}
