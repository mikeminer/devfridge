package cool.devfridge.world

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SkrBalanceTest {
    private val wallet = "11111111111111111111111111111111"

    @Test fun aggregatesOnlyTheOfficialMintAndSelectedAuthority() {
        val accounts = listOf(
            SkrBalance.TokenAccount(SkrBalance.MINT, wallet, "12"),
            SkrBalance.TokenAccount(SkrBalance.MINT, "11111111111111111111111111111112", "900"),
            SkrBalance.TokenAccount("11111111111111111111111111111111", wallet, "800"),
        )
        assertEquals("12", SkrBalance.rawBalance(wallet, accounts).toString())
        assertTrue(SkrBalance.eligible(wallet, accounts))
    }

    @Test fun rejectsZeroMalformedAndWrongWalletBalances() {
        assertFalse(SkrBalance.eligible(wallet, listOf(SkrBalance.TokenAccount(SkrBalance.MINT, wallet, "0"))))
        assertEquals("0", SkrBalance.rawBalance(wallet, listOf(SkrBalance.TokenAccount(SkrBalance.MINT, wallet, "1e8"))).toString())
    }
}
