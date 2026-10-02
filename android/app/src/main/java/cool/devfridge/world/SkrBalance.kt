package cool.devfridge.world

import java.math.BigInteger

/** Public, read-only SKR balance check. This is a cosmetic perk, never a competitive authorization. */
object SkrBalance {
    const val MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3"

    data class TokenAccount(val mint: String, val authority: String, val rawAmount: String)

    fun rawBalance(wallet: String, accounts: List<TokenAccount>): BigInteger {
        require(wallet.matches(Regex("[1-9A-HJ-NP-Za-km-z]{32,44}"))) { "Invalid Solana account." }
        return accounts.asSequence()
            .filter { it.mint == MINT && it.authority == wallet }
            .mapNotNull { account -> account.rawAmount.takeIf { it.matches(Regex("[0-9]{1,40}")) }?.let(::BigInteger) }
            .fold(BigInteger.ZERO, BigInteger::add)
    }

    fun eligible(wallet: String, accounts: List<TokenAccount>) = rawBalance(wallet, accounts).signum() > 0
}
