package cool.devfridge.world

import org.junit.Assert.*
import org.junit.Test

class BridgePolicyTest {
    @Test fun registrationLinksCarryIdentifiersOnly() {
        val request = "a".repeat(43); val run = "0x" + "ab".repeat(32)
        assertEquals(BridgePolicy.RegistrationReturn(request, run), BridgePolicy.registrationReturn("devfridgeworld://registration?run=$run&request=$request"))
        assertEquals(BridgePolicy.RegistrationReturn(), BridgePolicy.registrationReturn("devfridgeworld://registration"))
        listOf("https://registration?run=$run&request=$request", "devfridgeworld://user@registration", "devfridgeworld://registration.evil", "devfridgeworld://registration/path", "devfridgeworld://registration#message", "devfridgeworld://registration?run=$run&request=$request&message=evil", "devfridgeworld://registration?request=$request&request=$request", "devfridgeworld://registration?run=$run&request=bad").forEach {
            assertNull(it, BridgePolicy.registrationReturn(it))
        }
    }
    @Test fun onlyTheBundledGameCanUseTheBridge() {
        assertTrue(BridgePolicy.isGameDocument(BridgePolicy.GAME_URL))
        assertTrue(BridgePolicy.isGameDocument("https://world.devfridge.cool/world/game-v2/?player=a#fridge"))
        listOf("http://world.devfridge.cool/world/game-v2/", "https://world.devfridge.cool.evil.test/world/game-v2/",
            "https://world.devfridge.cool:8443/world/game-v2/", "https://user@world.devfridge.cool/world/game-v2/",
            "https://world.devfridge.cool/", "https://world.devfridge.cool/world/game-v2/../index.html",
            "https://world.devfridge.cool/world/game-v2/%2e%2e/index.html", "javascript:alert(1)").forEach {
            assertFalse(it, BridgePolicy.isGameDocument(it))
        }
    }
    @Test fun externalNavigationDoesNotForwardDangerousSchemes() {
        assertTrue(BridgePolicy.externalHttps("https://docs.devfridge.cool/world"))
        listOf("javascript:alert(1)", "file:///sdcard/a", "intent://wallet", "https://user@evil.test/").forEach {
            assertFalse(BridgePolicy.externalHttps(it))
        }
    }
    @Test fun publicKeysKeepLeadingZeroes() {
        assertEquals("11111111111111111111111111111111", BridgePolicy.base58(ByteArray(32)))
        assertEquals("2", BridgePolicy.base58(byteArrayOf(1)))
        assertEquals("12", BridgePolicy.base58(byteArrayOf(0, 1)))
        assertEquals("StV1DL6CwTryKyV", BridgePolicy.base58("hello world".toByteArray()))
    }
}
