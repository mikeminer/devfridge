package cool.devfridge.world

import java.math.BigInteger
import java.net.URI

/** Kept independent of Android so trust-boundary tests run on the JVM. */
object BridgePolicy {
    const val ORIGIN = "https://world.devfridge.cool"
    const val GAME_PATH = "/world/game-v2/"
    const val GAME_URL = "$ORIGIN${GAME_PATH}index.html"
    const val MAX_MESSAGE_BYTES = 16_384
    fun validRegistrationId(id: String) = id.matches(Regex("[A-Za-z0-9_-]{43}"))
    data class RegistrationReturn(val request: String? = null, val run: String? = null)
    fun registrationReturn(url: String?): RegistrationReturn? = try {
        val uri = URI(url ?: "")
        if (uri.scheme != "devfridgeworld" || uri.rawAuthority != "registration" || uri.rawPath !in listOf("", "/") || uri.rawFragment != null) null
        else if (uri.rawQuery == null) RegistrationReturn()
        else {
            val pairs = uri.rawQuery.split("&").map { it.split("=", limit = 2) }
            if (pairs.size != 2 || pairs.any { it.size != 2 } || pairs.map { it[0] }.toSet() != setOf("request", "run")) null
            else {
                val values = pairs.associate { it[0] to it[1] }
                val request = values.getValue("request"); val run = values.getValue("run")
                if (validRegistrationId(request) && run.matches(Regex("0x[0-9a-fA-F]{64}"))) RegistrationReturn(request, run) else null
            }
        }
    } catch (_: Exception) { null }
    fun isGameDocument(url: String?): Boolean = try {
        val uri = URI(url ?: "")
        uri.scheme == "https" && uri.host == "world.devfridge.cool" &&
            uri.port in listOf(-1, 443) && uri.rawUserInfo == null &&
            uri.rawPath in listOf(GAME_PATH, GAME_PATH + "index.html", "/world/game-v2")
    } catch (_: Exception) { false }

    fun externalHttps(url: String?): Boolean = try {
        val uri = URI(url ?: "")
        uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.rawUserInfo == null
    } catch (_: Exception) { false }

    fun base58(bytes: ByteArray): String {
        val alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
        var number = BigInteger(1, bytes)
        val radix = BigInteger.valueOf(58)
        val result = StringBuilder()
        while (number > BigInteger.ZERO) {
            val parts = number.divideAndRemainder(radix)
            result.append(alphabet[parts[1].toInt()]); number = parts[0]
        }
        bytes.takeWhile { it == 0.toByte() }.forEach { _ -> result.append('1') }
        return result.reverse().toString()
    }
}
