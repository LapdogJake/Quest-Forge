// ==============================================================================
// Quest-Forge: Library Compendium & Static Rulebook
// Shared reference for Contact, ToS, Economy, Amtgard RoP, Monster RoP, & Items
// ==============================================================================

const LIBRARY_DATA = [
  {
    id: 'contact',
    icon: '📧',
    title: 'Contact & Support',
    subtitle: 'Email, bug reports & park inquiries',
    content: `
      <div class="library-section-body">
        <p>For questions, bug reports, feature suggestions, or adding your local park/kingdom to Quest-Forge, reach out to:</p>
        <div class="library-highlight-box">
          <p style="margin:0; font-weight:bold; color:var(--primary); font-size:14px;">✉️ support@questforge.org</p>
          <small style="color:var(--text-muted);">Please include your kingdom, park name, and username in your message.</small>
        </div>
      </div>
    `
  },
  {
    id: 'tos',
    icon: '📜',
    title: 'Terms of Service (ToS)',
    subtitle: 'Fair play, account safety & community standards',
    content: `
      <div class="library-section-body">
        <h4 style="color:var(--text); margin:8px 0 4px 0;">1. Fair Play & Live Combat Honesty</h4>
        <p>Quest-Forge is designed to support live-action boffer combat and roleplay. Players and Questmasters agree to report battle outcomes honestly, respect hit calibration, and honor item durability consumption.</p>
        
        <h4 style="color:var(--text); margin:12px 0 4px 0;">2. Account & Gold Balance</h4>
        <p>Gold, pouches, and quest progress are scoped to your active Reign (Kingdom &rarr; Park &rarr; Questmaster). Tampering with client state or exploiting synchronization is prohibited.</p>

        <h4 style="color:var(--text); margin:12px 0 4px 0;">3. Safety & Amtgard Rules Precedence</h4>
        <p>In-person physical safety rules and local Amtgard park safety marshals always supersede digital quest objectives or combat encounters.</p>
      </div>
    `
  },
  {
    id: 'economy',
    icon: '🪙',
    title: 'In-Game Economy Guide',
    subtitle: 'Gold rewards, durability & resale formula',
    content: `
      <div class="library-section-body">
        <h4 style="color:var(--gold); margin:8px 0 4px 0;">🪙 Earning Gold</h4>
        <p>Players earn gold through:</p>
        <ul style="margin: 4px 0 10px 18px; font-size: 13px; line-height: 1.5;">
          <li><strong>Combat Encounters (Battles):</strong> Winning or participating in ditch battles, bridge battles, and monster line encounters.</li>
          <li><strong>Non-Combat Quests:</strong> Completing roleplay challenges, fetch quests, crafting tasks, or park assistance.</li>
        </ul>

        <h4 style="color:var(--gold); margin:12px 0 4px 0;">🎒 Pouch Carry Limits</h4>
        <p>To preserve combat balance, each player's pouch is strictly limited to:</p>
        <ul style="margin: 4px 0 10px 18px; font-size: 13px; line-height: 1.5;">
          <li><strong>Trinkets:</strong> Max 3 (1-point durability)</li>
          <li><strong>Talismans:</strong> Max 2 (5-point durability)</li>
          <li><strong>Artifacts:</strong> Max 1 (20-point durability)</li>
        </ul>

        <h4 style="color:var(--gold); margin:12px 0 4px 0;">🛡️ Durability & Item Resale</h4>
        <p>Items lose 1 point of durability per combat encounter where that category is active. Items with remaining durability can be sold back to the store at a 1:1 proportional rate:</p>
        <div class="library-highlight-box" style="text-align:center;">
          <code style="color:var(--gold); font-size:13px;">Resale Value = Floor( Base Cost &times; [ Current Durability / Max Durability ] )</code>
        </div>
      </div>
    `
  },
  {
    id: 'amtgard-rop',
    icon: '📖',
    title: 'Amtgard Rules of Play (RoP)',
    subtitle: 'Core combat, combat classes & magic incants',
    content: `
      <div class="library-section-body">
        <p>Quest-Forge operates under the standard <strong>Amtgard Rules of Play (Version 8)</strong>:</p>
        
        <h4 style="color:var(--primary); margin:10px 0 4px 0;">⚔️ Hit Locations & Damage</h4>
        <ul style="margin: 4px 0 10px 18px; font-size: 13px; line-height: 1.5;">
          <li><strong>Torso:</strong> Lethal hit resulting in death.</li>
          <li><strong>Limbs:</strong> Wounding hit disabling the limb. Two wounded limbs or one wounded limb + wound to torso is fatal.</li>
          <li><strong>Head, Neck, Groin:</strong> Illegal target areas. No damage is taken.</li>
        </ul>

        <h4 style="color:var(--primary); margin:10px 0 4px 0;">🛡️ Armor & Shield Ratings</h4>
        <p>Armor absorbs strikes based on its material rating (Cloth/Padded, Leather, Chain, Plate). Shields block physical and magic projectile strikes unless specified by weapon properties (e.g. Michael's Hammer, Shield Crushing).</p>

        <h4 style="color:var(--primary); margin:10px 0 4px 0;">✨ Verbal Incantations</h4>
        <p>Spells and abilities require clear, audible verbal incantations spoken at standard conversational volume without skipping syllables.</p>
      </div>
    `
  },
  {
    id: 'monster-manual',
    icon: '🐉',
    title: 'Monster Manual',
    subtitle: 'Bestiary, monster tiers & encounter abilities',
    content: `
      <div class="library-section-body">
        <p>The Monster Manual governs all monster encounters fought across ditch lines and scenarios:</p>

        <h4 style="color:#ef4444; margin:10px 0 4px 0;">👹 Standard Monster Tiers</h4>
        <ul style="margin: 4px 0 10px 18px; font-size: 13px; line-height: 1.5;">
          <li><strong>Tier 1 - Minions & Thralls:</strong> Goblins, skeletons, and kobolds. 1-hit kill, short respawn timers (15s&ndash;30s).</li>
          <li><strong>Tier 2 - Brutes & Specialists:</strong> Orcs, bugbears, and shadow-stalkers. Possess natural armor (1&ndash;2 pts) and weapon immunities.</li>
          <li><strong>Tier 3 - Apex & Bosses:</strong> Dragons, Liches, and Lycanthropes. Multiple natural armor points, spell immunity, and area-of-effect abilities.</li>
        </ul>

        <h4 style="color:#ef4444; margin:10px 0 4px 0;">⚡ Monster Traits & Immunities</h4>
        <p>Monsters may have special innate keywords such as <em>Immunity to Magic</em>, <em>Insubstantial</em>, <em>Flame Ward</em>, or <em>Shield Crush</em> specified in the encounter scenario card.</p>
      </div>
    `
  },
  {
    id: 'monster-rop',
    icon: '👹',
    title: 'Monster Rules of Play (Monster RoP)',
    subtitle: 'Monster player mechanics & durability rules',
    content: `
      <div class="library-section-body">
        <h4 style="color:#f59e0b; margin:8px 0 4px 0;">🎭 Player Monsters vs NPC Monsters</h4>
        <p>When participating in Monster Line encounters:</p>
        <ul style="margin: 4px 0 10px 18px; font-size: 13px; line-height: 1.5;">
          <li><strong>Player Monsters (Standard):</strong> Players playing as the monster team use their personal inventories and will lose durability on equipped allowed items just like Heroes.</li>
          <li><strong>NPC Monsters (QM Controlled):</strong> When a QM flags a battle with "Monsters are NPC", monster fighters do not risk durability loss.</li>
        </ul>

        <h4 style="color:#f59e0b; margin:10px 0 4px 0;">🛡️ Monster Line Respawn Formats</h4>
        <p>Monster line battles often use rolling waves or fixed respawn pools. When slain, monster players return to the designated monster boundary before re-entering combat.</p>
      </div>
    `
  },
  {
    id: 'item-list',
    icon: '✨',
    title: 'Magic Item List',
    subtitle: 'Catalog of Trinkets, Talismans & Artifacts',
    content: `
      <div class="library-section-body">
        <div id="library-catalog-rendered-items">
          <!-- Dynamically populated from STORE_CATALOG -->
        </div>
      </div>
    `
  }
];

// Render the Library Tab content
function renderLibrary() {
  const container = document.getElementById('library-content-container');
  if (!container) return;

  const countEl = document.getElementById('library-article-count');
  if (countEl) {
    countEl.innerText = `${LIBRARY_DATA.length} Guides`;
  }

  container.innerHTML = LIBRARY_DATA.map((section, index) => {
    const isFirst = index === 0;
    return `
      <div class="library-card" id="library-section-${section.id}" style="margin-bottom:12px; background:var(--card-bg, #18181b); border:1px solid var(--border, #27272a); border-radius:8px; overflow:hidden;">
        <div class="accordion-header" onclick="toggleLibraryAccordion('${section.id}')" style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; cursor:pointer; background:rgba(255,255,255,0.02); user-select:none;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:20px;">${section.icon}</span>
            <div>
              <div style="font-weight:bold; font-size:14px; color:var(--text, #f4f4f5);">${section.title}</div>
              <small style="color:var(--text-muted, #a1a1aa); font-size:11px;">${section.subtitle}</small>
            </div>
          </div>
          <span id="library-chevron-${section.id}" style="font-size:12px; color:var(--text-muted);">${isFirst ? '▲' : '▼'}</span>
        </div>
        <div id="library-body-${section.id}" class="accordion-content ${isFirst ? '' : 'hidden'}" style="padding:14px; border-top:1px solid var(--border, #27272a); font-size:13px; line-height:1.5;">
          ${section.content}
        </div>
      </div>
    `;
  }).join('');

  // Render the Magic Items dynamically from STORE_CATALOG
  renderLibraryItemList();
}

// Toggle individual accordion sections
function toggleLibraryAccordion(sectionId) {
  const body = document.getElementById(`library-body-${sectionId}`);
  const chevron = document.getElementById(`library-chevron-${sectionId}`);
  if (!body) return;

  const isHidden = body.classList.contains('hidden');
  if (isHidden) {
    body.classList.remove('hidden');
    if (chevron) chevron.innerText = '▲';
  } else {
    body.classList.add('hidden');
    if (chevron) chevron.innerText = '▼';
  }
}

// Helper to build the item catalog list
function renderLibraryItemList() {
  const target = document.getElementById('library-catalog-rendered-items');
  if (!target) return;

  if (typeof STORE_CATALOG === 'undefined' || !STORE_CATALOG.length) {
    target.innerHTML = `<p class="empty-state">Item catalog loading...</p>`;
    return;
  }

  const categories = ['Trinket', 'Talismans', 'Artifact'];

  target.innerHTML = categories.map(cat => {
    const items = STORE_CATALOG.filter(i => {
      if (cat === 'Trinket') return i.category === 'Trinket' || i.category === 'Trinkets';
      if (cat === 'Talismans') return i.category === 'Talismans' || i.category === 'Talisman';
      return i.category === 'Artifact' || i.category === 'Artifacts' || i.category === 'Legendary';
    });

    const maxDurability = cat === 'Trinket' ? 1 : (cat === 'Talismans' ? 5 : 20);
    const badgeColor = cat === 'Trinket' ? '#3b82f6' : (cat === 'Talismans' ? '#10b981' : '#f59e0b');

    return `
      <div style="margin-bottom: 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:4px;">
          <h4 style="margin:0; color:${badgeColor}; font-size:13px;">${cat}s (${maxDurability} Durability)</h4>
          <span style="font-size:11px; color:var(--text-muted);">${items.length} items</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr; gap:6px;">
          ${items.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; background:#121214; padding:8px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05); font-size:12px;">
              <div>
                <strong style="color:var(--text);">${item.item_name}</strong>
                <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">${item.description}</div>
              </div>
              <div style="color:var(--gold); font-weight:bold; white-space:nowrap; margin-left:8px; font-size:12px;">
                🪙 ${item.base_cost}g
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}
