import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";
import characters from "@/lib/brainrot-solana.json";

const baseMeta = docMeta("world");
const banner = "https://world.devfridge.cool/world/brainrot-pose-banner-v1.png";
export const metadata: Metadata = {
  ...baseMeta,
  openGraph: { ...baseMeta.openGraph, images: [{ url: banner, width: 1729, height: 910, alt: "The ten DevFridge brainrot characters posing together" }] },
  twitter: { ...baseMeta.twitter, images: [{ url: banner, alt: "The ten DevFridge brainrot characters posing together" }] },
};

export default function WorldDoc() {
  return (
    <DocsShell kicker="WORLD / COLD STORAGE" title="DevFridge World — the game guide">
      <p className="text-sm">Updated 8 September 2026 · Current pre-launch build</p>
      <h2 id="what-is-world">What is DevFridge World?</h2>
      <p>
        <strong>DevFridge World</strong> is a browser game featuring ten Italian brainrot
        characters, a walkable 3D kitchen and <strong>Cold Storage</strong>, a single-player
        physics merge puzzle. Drop matching memes into a fridge, combine them into higher
        tiers and beat your personal best while hearing the characters’ own voices and sounds.
        Solana Token-2022 timelocks unlock your playable meme, and fridge snapshots and score
        photos let you share the result with friends.
      </p>
      <img src={banner} width={1729} height={910} loading="lazy" className="mb-6 h-auto w-full rounded-xl" alt="The ten DevFridge World characters posing together in front of the fridge" />
      <nav aria-label="World guide sections" className="mb-8 rounded-xl border border-white/10 p-4">
        <strong>In this guide</strong>
        <ul>
          <li><a href="#how-it-works">How the game works</a></li>
          <li><a href="#what-makes-world-unique">What makes it unique</a></li>
          <li><a href="#availability">Availability and game facts</a></li>
          <li><a href="#wallet-access">Wallet access and the 500,000-token minimum</a></li>
          <li><a href="#why-ten-tokens">Why ten tokens? More choice for game access</a></li>
          <li><a href="#characters">The ten characters and their token addresses</a></li>
          <li><a href="#gameplay-overview">Gameplay overview</a></li>
          <li><a href="#controls">Phone and desktop controls</a></li>
          <li><a href="#sharing">Sharing and fridge visits</a></li>
          <li><a href="#earnings">Earnings and access costs</a></li>
          <li><a href="#faq">Frequently asked questions</a></li>
        </ul>
      </nav>

      <h2 id="how-it-works">How does DevFridge World work?</h2>
      <p>
        Connect a Solana wallet, sign in and unlock a character by keeping at least
        <strong> 500,000 tokens of its supported mint</strong> in active DevFridge timelocks.
        Choose an unlocked meme, enter the kitchen and play Cold Storage by aiming and
        dropping pieces so matching characters touch and merge without overflowing the fridge.
        Your score, collection and saved progress stay in the browser, while the game uses
        the DevFridge SDK to recheck the wallet’s on-chain locks.
      </p>

      <h2 id="what-makes-world-unique">What makes the gameplay unique?</h2>
      <p>
        World brings the Italian brainrot cast into a physics puzzle where positioning,
        growing pieces and quick chain merges determine how much you can fit inside one fridge.
        The meme you unlock becomes your kitchen avatar and normally your first puzzle piece,
        with character voices, signature sounds and themes giving the cast its personality.
        Fridge invitations and score photos turn a finished layout into something friends can
        open or share, while existing DevFridge timelocks provide character access.
      </p>

      <h2 id="availability">Availability and game facts</h2>
      <p>
        The game is deployed as a pre-launch build. The public entrance at{" "}
        <a href="https://world.devfridge.cool/">world.devfridge.cool</a> still shows the countdown
        and character runway until <strong>1 October 2026, 00:00 Europe/Rome</strong>.
        This guide describes the current game behind that launch screen.
      </p>
      <div className="overflow-x-auto">
        <table>
          <tbody>
            <tr><th scope="row">Genre</th><td>Casual physics merge puzzle, with a 3D kitchen to explore</td></tr>
            <tr><th scope="row">Players</th><td>Single-player; shareable saved fridge snapshots</td></tr>
            <tr><th scope="row">Platform</th><td>Desktop and mobile web browsers</td></tr>
            <tr><th scope="row">Blockchain integration</th><td>Solana wallet sign-in and Token-2022 timelock access</td></tr>
            <tr><th scope="row">Entry requirement</th><td>500,000 of one supported character token in active locks</td></tr>
            <tr><th scope="row">NFT requirement</th><td>None</td></tr>
            <tr><th scope="row">Game rewards</th><td>Score, personal best and discovered collection; no token payouts</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="wallet-access">Connect your wallet and unlock your meme</h2>
      <ol>
        <li>Connect your Solana wallet and sign the game’s sign-in message. Signing in does not authorize a transaction.</li>
        <li>The game checks your active DevFridge timelocks using the <a href="https://sdk.devfridge.cool/">DevFridge SDK</a>.</li>
        <li>Keep at least <strong>500,000 tokens of one supported character mint</strong> actively locked in <a href="https://devfridge.cool/">DevFridge</a>.</li>
        <li>Choose any character you have unlocked and enter the game with that meme.</li>
      </ol>
      <p>
        Active locks of the <strong>same token in the connected wallet add together</strong>.
        For example, 300,000 CICCIA plus 200,000 CICCIA in two active locks meets the minimum.
        300,000 CICCIA plus 200,000 APE does not: different mints are checked separately.
        Expired locks and tokens held outside a timelock do not count.
      </p>
      <p>
        There is no market-value ranking or biggest-lock winner. If several tokens meet the
        minimum, each unlocks its corresponding character. The game imposes no extra minimum
        remaining duration beyond the lock still being active. The current gate checks the
        ten <strong>Solana Token-2022</strong> character mints below; Robinhood locks and unrelated
        tokens, including $PASTA, do not unlock a character in this build.
      </p>
      <p>
        If you need a qualifying lock, the entry screen shows <strong>Buy</strong>, the full
        contract address with <strong>Copy CA</strong>, and <strong>Lock in DevFridge</strong>.
        Already own the tokens? Go straight to DevFridge to lock them. If your wallet is not
        detected on a phone, open World in your wallet’s browser.
      </p>
      <p>
        Access is rechecked every minute and when you return to the tab. A changed wallet,
        expired or insufficient lock, or an unsuccessful or stale verification pauses play
        and asks you to reconnect and recheck.
      </p>

      <h2 id="why-ten-tokens">Why ten different Pump.fun tokens?</h2>
      <p>
        <strong>Ten memes, ten ways into the same game.</strong> Each character has its own
        official Solana token on Pump.fun. Keeping at least 500,000 of any one supported
        token in active DevFridge timelocks unlocks that character and gives you access to
        World. You only need to qualify with one token, not all ten.
      </p>
      <p>
        The aim is to keep access flexible and more accessible as the community grows.
        If one character’s token becomes expensive, a new player can compare the ten
        options and choose a more affordable token to buy and lock. Every character has
        the same 500,000-token requirement, but the cost of meeting it depends on that
        token’s market price.
      </p>
      <p>
        Giving every meme a role in game access can spread participation and demand
        across the cast, helping more of the ten communities grow alongside World.
        Players gain a choice of entry routes, and each meme has a reason to be used.
        Prices can still rise or fall: this design does not fix the entry cost or
        guarantee that any or all of the tokens will increase in value.
      </p>

      <h2 id="characters">The ten playable memes</h2>
      <p>Use the full Solana mint address to identify a token. Each link below opens its Pump.fun page.</p>
      <div className="overflow-x-auto">
        <table>
          <thead><tr><th scope="col">Character</th><th scope="col">Token</th><th scope="col">Solana mint</th></tr></thead>
          <tbody>{Object.entries(characters).map(([id, character]) => (
            <tr key={id}>
              <td>{character.name}</td><td>{character.symbol}</td>
              <td><a href={character.marketUrl} target="_blank" rel="noopener noreferrer"><code>{character.address}</code></a></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <h2 id="gameplay-overview">What is the gameplay overview?</h2>
      <p>
        A run is about managing a small space as the pieces get larger. Aim for matching
        characters, leave room for their merged form and use quick successive merges to
        build a combo. The board’s physics means a new drop can move nearby pieces, so plan
        for where they will settle as well as where they first land.
      </p>
      <h3>Cold Storage: the run</h3>
      <ul>
        <li>Aim left or right and drop a meme into the fridge. Two matching characters that touch merge into the next tier.</li>
        <li>Higher-tier merges earn more points. Merges within 1.5 seconds increase your combo multiplier.</li>
        <li>Keep the stack below the door line. A settled piece remaining above it for 1.4 seconds ends the run.</li>
        <li>Make tier 9, Bonkatino, to win and bring in the secret guest, CICCIA.</li>
        <li>Your chosen meme is your kitchen avatar and normally your first piece. Choosing CICCIA starts the merge run at tier 1, so winning still requires progression.</li>
      </ul>
      <p>
        The daily piece sequence refreshes at midnight in Europe/Rome; the chosen first piece
        can differ between players. Your personal best and discovered collection stay in this
        browser, under the connected wallet. They do not automatically sync to another device.
      </p>

      <h3 id="sharing">The kitchen and fridge visits</h3>
      <p>
        Walk around as your meme, run, jump, shout its line and enter the fridge to play.
        Browse the collection to hear character voices, signature sounds and themes.
        The kitchen is single-player: the current game has no team shooter, PvP combat or live multiplayer avatars.
      </p>
      <p>
        <strong>Fridge visits</strong> let you share a saved fridge, open an invitation and react
        to a visited snapshot. The directory and reactions are stored locally in your browser;
        invitations carry a snapshot that can be opened in another browser. A visit shows the
        saved layout, not a live stream of the owner’s game. There is no global neighbourhood or online leaderboard.
      </p>
      <p>
        An invitation contains the shared fridge layout, display name, public wallet address,
        favourite character, scores and collection. Removing a directory entry does not revoke
        invitation links already shared.
      </p>

      <h2 id="controls">Phone and desktop controls</h2>
      <ul>
        <li><strong>Phone, fridge:</strong> drag left or right and release to drop, or use the drop button.</li>
        <li><strong>Phone, kitchen:</strong> use the direction buttons, Run, Jump and Shout. Movement supports multiple fingers.</li>
        <li><strong>Desktop, fridge:</strong> drag and release, or use Left/Right arrows and Space. R restarts; P pauses.</li>
        <li><strong>Desktop, kitchen:</strong> WASD or arrows to move, Shift to run, Space to jump, Q to shout and E to enter the fridge.</li>
      </ul>
      <p>
        On mobile, controls and notices sit outside the play canvas. Portrait uses controls
        below the board; landscape places controls beside it. Open <strong>Menu</strong> for
        your meme, collection, visits, wallet access and sound. Open dialogs pause the game.
      </p>
      <p>
        Sound activates on interaction. Use <strong>Menu → Enable sound</strong> to hear a voice
        confirmation. When you return after locking the screen, the game rebuilds its audio
        output; tap the game if the browser requires another interaction. The mute setting is respected.
      </p>

      <h2 id="score-sharing">Share your score and fridge photo</h2>
      <p>
        At the end of a run, choose <strong>Share photo &amp; score</strong> to preview your fridge
        with the score and world.devfridge.cool written into the image. Choose X, WhatsApp,
        Telegram, Facebook, Instagram or More apps.
      </p>
      <p>
        Where photo sharing is supported, your device opens its share menu with the prepared
        image and caption; choose the destination app and finish the post there. Otherwise,
        use <strong>Save photo</strong> and <strong>Copy caption</strong>, then attach the saved
        image in your social app. Posting a World homepage link uses the group banner of the
        ten brainrot characters; it does not display your personal score photo automatically.
      </p>
      <p>You can also save a replay file from the result screen. Scores and replays are local records, not verified competitive rankings.</p>

      <h3>Share your pick before launch</h3>
      <p>
        On the countdown page, pick a character and choose <strong>Post my pick on X</strong>
        to preview the group banner and your caption. The caption includes the selected
        token’s full Solana contract address, its Pump.fun link and the World link, with
        #SolanaGems, #SolanaCommunity and #solanamemes among the hashtags.
        Use <strong>Share banner + post</strong> on supported devices, or save the banner
        and copy the caption to attach them in X. You review and publish the post in your
        social app; choosing a meme does not post automatically or unlock game access.
      </p>

      <h2 id="earnings">How do you earn money in DevFridge World?</h2>
      <p>
        The current game has <strong>no money-earning mechanic</strong>. Merges award
        gameplay points, and runs contribute to your personal best and discovered collection;
        these are local game records, not redeemable tokens or cash. There is no reward
        token, NFT sale or rental system, staking yield, scholarship payout or cash tournament
        implemented in World.
      </p>
      <h3>Playing is free once your meme is unlocked</h3>
      <p>
        Play as many runs as you like while your qualifying timelock remains active.
        There is <strong>no per-run payment, game escrow, play-to-earn reward or daily token prize</strong>.
        Buying tokens and creating a DevFridge lock are separate actions; see the{" "}
        <a href="https://docs.devfridge.cool/fridge">Fridge guide</a> for the locking process and its rules.
      </p>
      <p>
        World is best described as a game with <strong>crypto required for access</strong>:
        the qualifying tokens must already be owned and actively locked. A timelock is an
        access condition, not a deposit into a game prize pool, and a high score does not
        change the lock’s release time or grant a token payout.
      </p>

      <h2 id="faq">Frequently asked questions</h2>
      <h3>What type of gameplay is World?</h3>
      <p>
        Cold Storage is a casual, single-player physics merge puzzle. The kitchen adds
        exploration and character actions, and fridge visits let you view shared snapshots.
        The current build has no PvP combat, team matches or live multiplayer room.
      </p>
      <h3>Which blockchain is the game on?</h3>
      <p>
        The current access gate checks Solana Token-2022 character tokens locked in
        DevFridge. Wallet sign-in and lock verification use Solana; the physics simulation,
        scores and saved progress run in your browser. Robinhood locks do not qualify for
        this game’s current access gate.
      </p>
      <h3>Which devices can I use?</h3>
      <p>
        Play in a desktop or mobile browser. World does not currently offer a native
        App Store or Google Play release. On a phone, use your wallet’s browser if the
        regular browser cannot detect the wallet, and tap to enable sound when prompted.
      </p>
      <h3>How do I start, and is the game open yet?</h3>
      <p>
        Visit <a href="https://world.devfridge.cool/">World</a> for the current countdown
        and character runway. The scheduled opening is 1 October 2026, 00:00 Europe/Rome.
        Once entering the game, follow the <a href="#wallet-access">wallet and timelock
        steps</a>, choose an unlocked meme and enter the fridge from the kitchen.
      </p>
      <h3>Do I need 500,000 tokens in a single lock?</h3>
      <p>
        No. Active locks of the same supported mint in the connected wallet add together:
        300,000 CICCIA plus 200,000 CICCIA qualifies. Amounts in different wallets, different
        character tokens, expired locks or an ordinary wallet balance do not combine toward
        that character’s minimum. The threshold uses token quantity, not market value.
      </p>
      <h3>What if I qualify with more than one character token?</h3>
      <p>
        Every supported mint that meets the minimum unlocks its corresponding meme, and
        you choose which unlocked character to use. More CICCIA locks can help CICCIA meet
        the threshold, but they do not prevent you from selecting another eligible meme.
      </p>
      <h3>Why is my connected wallet still unable to enter?</h3>
      <p>
        A connected wallet must also pass sign-in and lock verification. Check the full mint
        address against the <a href="#characters">character table</a>, make sure the locks
        are active and total at least 500,000 of that token in this wallet, then recheck access.
        If verification fails or becomes stale, play pauses until a successful check.
      </p>
      <h3>Can I withdraw the locked tokens by leaving the game?</h3>
      <p>
        Leaving World does not end a DevFridge timelock. Its release rules belong to
        DevFridge and the lock you created; follow the <a href="https://docs.devfridge.cool/fridge">Fridge
        guide</a> for the locking and release process. Once a lock expires, it stops counting
        toward game access even if the tokens have not yet been withdrawn.
      </p>
      <h3>Do I pay for every run or win tokens for a high score?</h3>
      <p>
        No. You can start further runs while your meme remains unlocked, without a game
        entry payment. Scores, combos and wins have no token payout or cash redemption.
        Buying tokens and creating locks are separate from playing.
      </p>
      <h3>Are scores and fridge visits shared live between players?</h3>
      <p>
        No. Progress, personal bests, the visit directory and reactions are stored in the
        browser. A fridge invitation carries a saved snapshot that another browser can open;
        it is not a live session. Clearing browser storage can remove local progress, and
        it does not automatically follow you to another device.
      </p>
      <h3>Which guilds partner with World, and who invested in it?</h3>
      <p>
        No confirmed World-specific guild partnership or investor list is published in this
        guide. The character tokens and directory submission requests are not evidence of
        such partnerships. Check <a href="https://connect.devfridge.cool/">official DevFridge
        contacts</a> for verified announcements.
      </p>
      <h3>Where can I find the official game links and artwork?</h3>
      <p>
        Use <a href="https://world.devfridge.cool/">world.devfridge.cool</a> as the game
        entrance, this page for the guide and character mint addresses, and{" "}
        <a href="https://connect.devfridge.cool/">connect.devfridge.cool</a> for official
        community links. The <a href={banner}>cast banner</a> is promotional artwork;
        your own fridge photo is created from the result screen after a run.
      </p>
      <p><a className="fridge-key fridge-key-primary" href="https://world.devfridge.cool/">Visit DevFridge World</a></p>
    </DocsShell>
  );
}
