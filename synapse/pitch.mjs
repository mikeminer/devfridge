const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count = value => Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString('en-US') : 'Not observed';
const sourceDate = record => `${record.status === 'ok' ? 'Observed' : record.status === 'stale' ? 'STALE' : 'Unavailable'} · ${record.fetched_at ?? 'no successful observation'}`;

export function makePitch(protocol) {
  const a = protocol.activity;
  return {
    summary: 'DevFridge turns a Solana Token-2022 lock into reusable proof of commitment: public lock evidence, community tools and SDK access gates using a project’s own supported mint.',
    products: [
      {name:'Fridge', role:'Create the commitment', detail:'A depositor creates a time-lock in a program-controlled vault and claims after the unlock date under the program rules.', url:'https://devfridge.cool', source:'https://docs.devfridge.cool/fridge'},
      {name:'Scan, badge & bot', role:'Make it visible', detail:'Inspect lock evidence and risk signals. Embed a badge or share a bot report. Sponsored placement does not change scanner grades.', url:'https://scan.devfridge.cool', source:'https://docs.devfridge.cool/scan'},
      {name:'DevFridge SDK', role:'Give the lock a use', detail:'Configure mint, minimum amount, lock duration and renewal threshold. Gate a community resource with server-side checks.', url:'https://sdk.devfridge.cool', source:'https://docs.devfridge.cool/sdk'},
    ],
    pilot: {status:'proposed', goal:'One useful integration, then evidence of repeat use.', days_1_30:'Agree on a community benefit, integration requirements and success measures. Test access and renewal states.', days_31_60:'Invite voluntary participants. Measure qualifying wallets and successful access; attribute outside participation only with evidence and consent.', days_61_90:'Publish repeat-use and renewal results. A stretch target of 40 independently attributed participant wallets is proposed, not achieved or guaranteed.'},
    demo: [
      'Match the full PASTA mint in Scan and inspect a lock separately from the risk signals.',
      'Open the SDK examples: configure a supported mint, amount, duration and renewal threshold.',
      'Show the badge and bot, then follow the same evidence into Synapse’s graph.'
    ],
    disclosures: [
      'No independent audit is claimed. Public source and tests are not an audit.',
      'Fridge source: BSL 1.1; stated change date 18 August 2030, GPL v2.0 or later. Synapse has separate AGPL terms.',
      'The SDK integration is a pilot proposal. No paying customers, signed partnerships or revenue are established here.',
      'Depositor wallets are not necessarily distinct people or external adopters. Open-account counts exclude claimed and closed accounts.',
      'Burn-token value and current vault balance cannot establish cumulative fee revenue.',
    ],
    share_text: `DevFridge makes token commitment usable: lock Token-2022 supply, show the proof through Scan/badges/the bot, and use the SDK to gate access with a project’s supported mint. ${a.data ? `Observed ${count(a.data.active_locks)} active locks and ${count(a.data.depositor_wallets)} depositor wallets among currently open accounts (${a.fetched_at}; ${a.status}). ` : ''}Outside adoption and revenue still need evidence. Explore a community SDK pilot: https://synapse.devfridge.cool/ . PASTA mint: 39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump. No independent audit claimed.`
  };
}

export function pitchHTML(brief) {
  const p=brief.pitch, a=brief.protocol.activity, lp=brief.protocol.lp, stats=brief.protocol.reported_stats;
  const supply=lp.data?.supply_base_units;
  return `<section id="products" class="product-pitch"><div class="section-heading"><div><p class="eyebrow">THE PRODUCT IN ONE MINUTE</p><h2>Create once. Verify anywhere.</h2></div><a href="/graph.html#/investor/kol.md">Read the pitch in the graph ↗</a></div><div class="product-flow">${p.products.map((product,i)=>`<article><span class="flow-step">0${i+1}</span><p class="eyebrow">${esc(product.role)}</p><h3>${esc(product.name)}</h3><p>${esc(product.detail)}</p><a href="${product.url}">Open product ↗</a> · <a href="${product.source}">How it works</a></article>`).join('')}</div><p class="section-note">World, Bridge, Health and Team extend the ecosystem. World’s current guide describes a pre-launch merge game and 3D kitchen. <a href="https://docs.devfridge.cool/world">Check availability and game rules</a>. Bridge eligibility is route-specific.</p></section>
<section id="adoption"><div class="section-heading"><div><p class="eyebrow">ADOPTION · SHOW THE BASELINE</p><h2>The next proof is repeat use.</h2></div><a href="/graph.html#/investor/protocol.md">Inspect source evidence ↗</a></div><div class="quick-stats"><div><span>Active locks</span><strong>${count(a.data?.active_locks)}</strong><small>Unexpired at observation</small></div><div><span>Depositor wallets</span><strong>${count(a.data?.depositor_wallets)}</strong><small>Among currently open accounts</small></div><div><span>Distinct mints</span><strong>${count(a.data?.unique_mints)}</strong><small>Among currently open accounts</small></div><div><span>Open lock accounts</span><strong>${count(a.data?.open_lock_accounts)}</strong><small>Includes expired, unclaimed accounts</small></div></div><p class="timestamp">${esc(sourceDate(a))}${a.data ? ` · finalized Solana slot ${a.data.slot}` : ''}</p><p>These counts show protocol use. They do not establish how many users are independent, whether a wallet is external, or lifetime adoption after accounts close. <strong>External adoption and cumulative fee revenue are not established.</strong></p><div class="evidence-pair"><article><h3>PASTA LP evidence</h3><p class="evidence-number">${supply === undefined ? 'Not observed' : supply === '0' ? '0 outstanding LP units' : `${esc(supply)} LP base units`}</p><p class="timestamp">${esc(sourceDate(lp))}${lp.data ? ` · slot ${lp.data.slot}` : ''}</p><p>For the named PASTA PumpSwap LP mint. Zero supply is observed evidence; it is not a guarantee of future liquidity or prices.</p><a href="https://solscan.io/token/9Yi9cwm3Non7LoFkxC6eKgp38CSbbXPvYH3VTrz2KC4V">Verify the LP mint ↗</a></article><article><h3>Keep revenue separate</h3><p>The stats endpoint reports ${esc(stats.data?.reported_pasta_burned ?? 'no observed value')} PASTA under its burn metric and ${stats.data ? esc(stats.data.boost_vault_lamports / 1e9) : 'an unobserved'} SOL in the boost vault. Its published burn metric reads an incinerator token balance; it is not a complete SPL burn ledger.</p><p class="timestamp">${esc(sourceDate(stats))}</p><a href="https://github.com/mikeminer/devfridge/blob/master/scan/lib/stats.ts">Read the accounting scope ↗</a></article></div></section>
<section id="pilot" class="pilot-section"><div><p class="eyebrow">FOR KOLS & COMMUNITY BUILDERS</p><h2>Bring one community.<br>Give the lock a purpose.</h2><p>Try a gated research area, creator tool or community resource. Your project chooses the supported mint and benefit; the pilot tests whether users return.</p><div class="actions"><a href="#contacts">Discuss an SDK pilot</a><a href="https://sdk.devfridge.cool">Open integration examples ↗</a></div><p class="timestamp">Proposed collaboration. Terms, delivery scope and any compensation require agreement.</p></div><ol class="pilot-timeline"><li><strong>Days 1–30 · Integrate</strong><p>${esc(p.pilot.days_1_30)}</p></li><li><strong>Days 31–60 · Observe</strong><p>${esc(p.pilot.days_31_60)}</p></li><li><strong>Days 61–90 · Report</strong><p>${esc(p.pilot.days_61_90)}</p></li></ol></section>
<section id="kol-kit"><div class="section-heading"><h2>A demo worth sharing.</h2><span>Three minutes · source-linked</span></div><ol>${p.demo.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><label for="kol-copy">Community introduction</label><textarea id="kol-copy" readonly>${esc(p.share_text)}</textarea><button data-copy="${esc(p.share_text)}">Copy KOL introduction</button><details><summary>Facts to preserve when you share</summary><ul>${p.disclosures.map(text=>`<li>${esc(text)}</li>`).join('')}</ul><a href="https://docs.devfridge.cool/security">Audit disclosure</a> · <a href="https://github.com/mikeminer/devfridge/blob/master/LICENSE">License terms</a></details></section>`;
}

export function pitchMarkdown(brief) {
  const p=brief.pitch;
  return ['## Product pitch for KOLs',p.summary,...p.products.map(v=>`- ${v.name}: ${v.detail} ${v.url}`),
    '', '### Adoption evidence',...Object.entries(brief.protocol).map(([name,record])=>`${name}: ${sourceDate(record)}\nSource: ${record.source ?? 'unavailable'}\n${JSON.stringify(record.data ?? null)}`),
    '', '### Proposed 90-day SDK pilot',p.pilot.goal,p.pilot.days_1_30,p.pilot.days_31_60,p.pilot.days_61_90,
    '', '### Three-minute demo',...p.demo.map((v,i)=>`${i+1}. ${v}`),'', '### Community introduction',p.share_text,
    '', '### Disclosures',...p.disclosures.map(v=>'- '+v),''].join('\n');
}
