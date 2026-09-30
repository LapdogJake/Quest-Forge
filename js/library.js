// ==============================================================================
// Quest-Forge: Library Compendium & Static Rulebook
// ==============================================================================

const LIBRARY_DATA = [
  {
    id: 'magic-item-rules',
    icon: '✨',
    title: 'Magic Item Rules',
    subtitle: 'Official 13-Point Magic Item Rules',
    content: `
      <div class="library-section-body">
        <ol style="margin: 4px 0 8px 20px; padding: 0; font-size: 13px; line-height: 1.6; color: var(--text);">
          <li style="margin-bottom: 8px;">Magical Items each have a category corresponding with their level of power from Trinket to Talisman to Artifact.</li>
          <li style="margin-bottom: 8px;">Magical Items are awarded at the discretion of the group officers.</li>
          <li style="margin-bottom: 8px;">The officers of the group are responsible for tracking what Magic Items are owned by whom.</li>
          <li style="margin-bottom: 8px;">Some Magic Items are one-use only. Magic Items which are used up are no longer available to the player and must be reported to the officers of the group.</li>
          <li style="margin-bottom: 8px;">Ownership of Magical Items resets at the beginning of each reign.</li>
          <li style="margin-bottom: 8px;">Magical Items may only be used by the person to whom they are given initially. Magical Items may not be transferred or traded to another player without the permission of the monarch who awarded them and the reeve of the battlegame.</li>
          <li style="margin-bottom: 8px;">All magical items require the player to carry a copy of the write-up in order to function.</li>
          <li style="margin-bottom: 8px;">Enchantments conferred by Magical Items function exactly as normal (m) Enchantments; they count towards your Enchantment limit, may be removed by Dispel Magic, require a strip, etc.</li>
          <li style="margin-bottom: 8px;">Some Magic Items have a material component requirement. These components must be present in order for the Magic Item to be used and must be verified by the reeve prior to the start of the battlegame. Identical material component requirements may all be served by the same physical object. You do not need a unique bottle for each potion.</li>
          <li style="margin-bottom: 8px;">Magical Items only function at the group level they were awarded and are unique to that group. For instance a player who receives a Magical Item at the park level may only use it at that park, but a player who receives a Magical Item at the kingdom level may use it at any park in that kingdom.</li>
          <li style="margin-bottom: 8px;">Magical Items may not be used at interkingdom events unless allowed by the host kingdom.</li>
          <li style="margin-bottom: 8px;">Magic items that may be destroyed cease to function in all ways while destroyed.</li>
          <li style="margin-bottom: 8px;">Uses of abilities granted by a Magic Item are tracked separately from a player's own abilities, and are recharged separately.</li>
        </ol>
      </div>
    `
  },
  {
    id: 'battlegaming-magic-items',
    icon: '⚔️',
    title: 'Battlegaming With Magic Items',
    subtitle: 'Reeve authority, game sizes & player item limits',
    content: `
      <div class="library-section-body">
        <p style="margin: 0 0 10px 0; color: var(--text-muted); font-size: 13px; line-height: 1.5;">
          Here are some basic guidelines for how to use Magic Items in battlegames. These guidelines may be changed or adapted by the battlegame reeve. Reeves are always encouraged to consider game balance when determining what Magic Items are allowed in the game.
        </p>
        <ol style="margin: 4px 0 8px 20px; padding: 0; font-size: 13px; line-height: 1.6; color: var(--text);">
          <li style="margin-bottom: 8px;">Magic Items are typically only used in full-class battlegames.</li>
          <li style="margin-bottom: 8px;">The reeve always has final say over the use or behavior of Magic Items in a battlegame.</li>
          <li style="margin-bottom: 8px;">The reeve for the game has the final say in what Magical Items (if any) are allowed in a battlegame in all situations.</li>
          <li style="margin-bottom: 8px;">Typically games with less than 14 people are limited to Trinkets, 15 to 30 people may use up to Talismans, and games with more than 30 people may use Artifacts.</li>
          <li style="margin-bottom: 8px;">A player may use up to one Artifact in a battlegame.</li>
          <li style="margin-bottom: 8px;">A player may use up to two Talismans in a battlegame.</li>
          <li style="margin-bottom: 8px;">A player may use up to three Trinkets in a battlegame.</li>
        </ol>
      </div>
    `
  },
  {
    id: 'trinkets-rop',
    icon: '🧪',
    title: 'Trinkets (Amtgard RoP 8.7)',
    subtitle: 'Potions, scrolls & one-use magical items',
    content: `
      <div class="library-section-body">
        <div style="display:flex; flex-direction:column; gap:10px;">

          <!-- Potion of Barkskin -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Potion of Barkskin</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I drink a potion of barkskin&rdquo;</div>
              <div><strong>M:</strong> A bottle measuring at least two cubic inches</div>
              <div><strong>E:</strong> Player casts Barkskin (m).</div>
            </div>
          </div>

          <!-- Potion of Refreshment -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Potion of Refreshment</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I drink a potion of refreshment&rdquo;</div>
              <div><strong>M:</strong> A bottle measuring at least two cubic inches</div>
              <div><strong>E:</strong> Player casts Confidence (m).</div>
            </div>
          </div>

          <!-- Potion of Healing -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Potion of Healing</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I drink a potion of healing&rdquo;</div>
              <div><strong>M:</strong> A bottle measuring at least two cubic inches</div>
              <div><strong>E:</strong> Player casts Heal (self).</div>
            </div>
          </div>

          <!-- Potion of True Death -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Potion of True Death</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I drink a potion of true death&rdquo;</div>
              <div><strong>M:</strong> A bottle measuring at least two cubic inches</div>
              <div><strong>E:</strong> Player may not be the target of Raise Dead, Steal Life Essence, Undead Minion, or Vampirism for the duration of the game.</div>
              <div><strong>N:</strong> This effect is not removed by Release, Greater Release, or Respawn.</div>
            </div>
          </div>

          <!-- Scroll of Adaptive Blessing -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Scroll of Adaptive Blessing</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I read from a scroll of adaptive blessing&rdquo;</div>
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches</div>
              <div><strong>E:</strong> Player casts Adaptive Blessing (m).</div>
            </div>
          </div>

          <!-- Scroll of Ambulant -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Scroll of Ambulant</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I read from a scroll of ambulant&rdquo;</div>
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches</div>
              <div><strong>E:</strong> Player's next magic is affected as per Ambulant.</div>
              <div><strong>L:</strong> May only be used by Magic Users.</div>
            </div>
          </div>

          <!-- Scroll of Blessing Against Wounds -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Scroll of Blessing Against Wounds</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I read from a scroll of blessing against wounds&rdquo;</div>
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches</div>
              <div><strong>E:</strong> Player casts Blessing Against Wounds (m).</div>
            </div>
          </div>

          <!-- Scroll of Extension -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Scroll of Extension</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I read from a scroll of extension&rdquo;</div>
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches</div>
              <div><strong>E:</strong> Player's next magic is affected as per Extension.</div>
              <div><strong>L:</strong> May only be used by Magic Users.</div>
            </div>
          </div>

          <!-- Scroll of Harden -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Scroll of Harden</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I read from a scroll of harden&rdquo;</div>
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches</div>
              <div><strong>E:</strong> Player casts Harden (m).</div>
            </div>
          </div>

          <!-- Scroll of Mend -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Scroll of Mend</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I read from a scroll of mend&rdquo;</div>
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches</div>
              <div><strong>E:</strong> Player casts Mend (m).</div>
            </div>
          </div>

        </div>
      </div>
    `
  },
  {
    id: 'talismans-rop',
    icon: '🛡️',
    title: 'Talismans (Amtgard RoP 8.7)',
    subtitle: 'Amulets, bracelets & multi-charge wands',
    content: `
      <div class="library-section-body">
        <p style="margin: 0 0 10px 0; color: var(--text-muted); font-size: 13px; line-height: 1.5;">
          Talismans are Magical Items of meaningful power that may require consideration before being allowed in some battlegames.
        </p>
        <div style="display:flex; flex-direction:column; gap:10px;">

          <!-- Amulet of Force -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Amulet of Force</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> 1/Game &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;By my amulet&rdquo; + Force Barrier Incant</div>
              <div><strong>M:</strong> Pendant or amulet measuring at least one square inch which must be worn around the neck.</div>
              <div><strong>E:</strong> Player casts Force Barrier (m).</div>
            </div>
          </div>

          <!-- Amulet of Teleport -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Amulet of Teleport</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> 1/Game &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;By my amulet&rdquo; + Teleport Incant</div>
              <div><strong>M:</strong> Pendant or amulet measuring at least one square inch which must be worn around the neck.</div>
              <div><strong>E:</strong> Player casts Teleport (m).</div>
            </div>
          </div>

          <!-- Amulet of Tracking -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Amulet of Tracking</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> 1/Game &nbsp;|&nbsp; <strong>R:</strong> 20&prime;</div>
              <div><strong>I:</strong> &ldquo;By my amulet&rdquo; + Tracking Incant</div>
              <div><strong>M:</strong> Pendant or amulet measuring at least one square inch which must be worn around the neck.</div>
              <div><strong>E:</strong> Player casts Tracking (ex).</div>
            </div>
          </div>

          <!-- Amulet of Shadows -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Amulet of Shadows</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> 1/Game &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;By my amulet&rdquo; + Shadow Step Incant</div>
              <div><strong>M:</strong> Pendant or amulet measuring at least one square inch which must be worn around the neck.</div>
              <div><strong>E:</strong> Player casts Shadow Step (ex).</div>
            </div>
          </div>

          <!-- Bracelet of Anti-Magic -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Bracelet of Anti-Magic</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> 1/Game &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I draw upon the power of my bracelet of anti-magic&rdquo;</div>
              <div><strong>M:</strong> Bracelet measuring at least 1&rdquo; wide worn around the wrist. Must be made of leather or metal and may not be red, yellow, or white.</div>
              <div><strong>E:</strong> Player casts Protection From Magic (m).</div>
            </div>
          </div>

          <!-- Bracelet of Solidity -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Bracelet of Solidity</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on while worn</div>
              <div><strong>M:</strong> Bracelet measuring at least 1&rdquo; wide worn around the wrist. Must be made of leather or metal and may not be red, yellow, or white.</div>
              <div><strong>E:</strong> Further Effects which make the player Insubstantial, including effects initiated by the player or beneficial effects, fail as per Planar Grounding. Bearer must announce &ldquo;Immune to insubstantial&rdquo; when this effect is triggered.</div>
            </div>
          </div>

          <!-- Bracelet of Stoneskin -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Bracelet of Stoneskin</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> 1/Game &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I draw upon the power of my bracer of stoneskin&rdquo;</div>
              <div><strong>M:</strong> Bracelet measuring at least 1&rdquo; wide worn around the wrist. Must be made of leather or metal and may not be red, yellow, or white.</div>
              <div><strong>E:</strong> Player casts Stoneskin (m).</div>
            </div>
          </div>

          <!-- Wand of Healing -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Wand of Healing</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> 2/Game &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;My wand heals thee&rdquo;</div>
              <div><strong>M:</strong> Rigid wand measuring at least 6&rdquo; long and at least 0.5&rdquo; in diameter.</div>
              <div><strong>E:</strong> Player casts Greater Heal (m).</div>
            </div>
          </div>

          <!-- Wand of Mending -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Wand of Mending</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> 2/Game &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;My wand makes this item whole&rdquo;</div>
              <div><strong>M:</strong> Rigid wand measuring at least 6&rdquo; long and at least 0.5&rdquo; in diameter.</div>
              <div><strong>E:</strong> Player casts Greater Mend (m).</div>
            </div>
          </div>

          <!-- Wand of Release -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Wand of Release</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> 2/Game &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;My wand releases thee&rdquo;</div>
              <div><strong>M:</strong> Rigid wand measuring at least 6&rdquo; long and at least 0.5&rdquo; in diameter.</div>
              <div><strong>E:</strong> Player casts Greater Release (m).</div>
            </div>
          </div>

        </div>
      </div>
    `
  },
  {
    id: 'artifacts-rop',
    icon: '⚔️',
    title: 'Artifacts (Amtgard RoP 8.7)',
    subtitle: 'Unique kingdom-tier legendary relics & weapons',
    content: `
      <div class="library-section-body">
        <p style="margin: 0 0 10px 0; color: var(--text-muted); font-size: 13px; line-height: 1.5;">
          Artifacts are powerful Magical Items which require careful consideration before being allowed into any battlegame. Artifacts are unique; there may only be one of each Artifact awarded per kingdom at a time.
        </p>
        <div style="display:flex; flex-direction:column; gap:10px;">

          <!-- Ankh of Ran -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--gold); font-size:14px; margin-bottom:4px;">Ankh of Ran</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on while worn</div>
              <div><strong>M:</strong> A white ankh measuring at least twenty-five square inches prominently displayed on garb/equipment, or worn as an amulet.</div>
              <div><strong>E:</strong> Bearer gains Terror (20&prime;) Unlimited (ex). Terror may only be cast on players bearing Undead Minion, Vampirism, or Void Touched and will affect those players regardless of immunities.</div>
            </div>
          </div>

          <!-- Andalsa's Lament -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--gold); font-size:14px; margin-bottom:4px;">Andalsa's Lament</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on while worn</div>
              <div><strong>M:</strong> A helmet worn upon the head which qualifies for the helm armor modifier. Must have a white Enchantment strip tied to it.</div>
              <div><strong>E:</strong> Bearer is affected as per Imbue Armor. Does not count as an Enchantment.</div>
            </div>
          </div>

          <!-- Cloak of Enigmas -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--gold); font-size:14px; margin-bottom:4px;">Cloak of Enigmas</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on while worn</div>
              <div><strong>M:</strong> A black cloak that covers from the shoulders to the back of the knees.</div>
              <div><strong>E:</strong> Doubles the bearer's normal use of Shadow Step, Teleport, and Blink. Does not count as an Enchantment.</div>
              <div><strong>L:</strong> May only be used by Assassin or Scout.</div>
            </div>
          </div>

          <!-- Homestone -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--gold); font-size:14px; margin-bottom:4px;">Homestone</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on while carried</div>
              <div><strong>I:</strong> As per Greater Mend</div>
              <div><strong>M:</strong> A highly polished stone sphere at least 1&rdquo; in diameter.</div>
              <div><strong>E:</strong> Bearer gains Greater Mend 1/Life Charge x3. Does not count as an Enchantment.</div>
            </div>
          </div>

          <!-- Michael's Hammer -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--gold); font-size:14px; margin-bottom:4px;">Michael's Hammer</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on while carried</div>
              <div><strong>M:</strong> A Short weapon with a yellow cover or lightning decorations. Must have a red Enchantment strip tied to it. Must have at least 6&rdquo; of Heavy Padding and be shaped like a hammer.</div>
              <div><strong>E:</strong> This weapon is Armor Destroying and Shield Destroying. Does not count as an Enchantment.</div>
            </div>
          </div>

          <!-- Nuntius Staff -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--gold); font-size:14px; margin-bottom:4px;">Nuntius Staff</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on</div>
              <div><strong>M:</strong> A double ended great weapon no longer than 6&prime; or a Magic Staff.</div>
              <div><strong>E:</strong> May be used by any Magic User at no cost to magic points. Grants an additional two magic points at the user's highest level. Magic points gained are not removed regardless of what happens to the staff. Does not count as an Enchantment.</div>
              <div><strong>L:</strong> May only be used by Magic Users.</div>
            </div>
          </div>

          <!-- Phase Blade -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--gold); font-size:14px; margin-bottom:4px;">Phase Blade</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on while carried</div>
              <div><strong>M:</strong> A Short weapon with a gray cover or force themed decorations. Must have a red and a yellow Enchantment strip tied to it.</div>
              <div><strong>E:</strong> This weapon is Phasing. Does not count as an Enchantment.</div>
            </div>
          </div>

          <!-- Shield of the Chosen -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--gold); font-size:14px; margin-bottom:4px;">Shield of the Chosen</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on</div>
              <div><strong>M:</strong> A medium shield with a black cover featuring a white device. Must have a white Enchantment strip tied to it.</div>
              <div><strong>E:</strong> Shield is completely indestructible, including against other Magical Items. Engulfing effects striking the shield are nullified and ignored while it is wielded. Does not count as an Enchantment.</div>
            </div>
          </div>

          <!-- Sword of Flame -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--gold); font-size:14px; margin-bottom:4px;">Sword of Flame</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on while carried</div>
              <div><strong>M:</strong> A Short weapon with an orange cover or flame decorations. Must have a red and a white Enchantment strip tied to it.</div>
              <div><strong>E:</strong> The bearer and this weapon are Immune to Flame. This weapon is Armor Breaking and Shield Crushing. Does not count as an Enchantment.</div>
            </div>
          </div>

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
    countEl.innerText = `${LIBRARY_DATA.length} Section`;
  }

  container.innerHTML = LIBRARY_DATA.map((section) => {
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
          <span id="library-chevron-${section.id}" style="font-size:12px; color:var(--text-muted);">▲</span>
        </div>
        <div id="library-body-${section.id}" class="accordion-content" style="padding:14px; border-top:1px solid var(--border, #27272a); font-size:13px; line-height:1.5;">
          ${section.content}
        </div>
      </div>
    `;
  }).join('');
// Sub-tab switching between Magic Items and Monsters
function switchLibrarySubTab(subTab) {
  const isItems = subTab === 'items';
  const itemsContainer = document.getElementById('library-subtab-items');
  const monstersContainer = document.getElementById('library-subtab-monsters');
  const btnItems = document.getElementById('library-subnav-items');
  const btnMonsters = document.getElementById('library-subnav-monsters');

  if (itemsContainer) itemsContainer.classList.toggle('hidden', !isItems);
  if (monstersContainer) monstersContainer.classList.toggle('hidden', isItems);

  if (btnItems) btnItems.classList.toggle('active', isItems);
  if (btnMonsters) btnMonsters.classList.toggle('active', !isItems);

  const countEl = document.getElementById('library-article-count');
  if (countEl) {
    countEl.innerText = isItems ? `${LIBRARY_DATA.length} Sections` : 'Compendium';
  }

  if (isItems) {
    renderLibrary();
  } else {
    renderMonstersLibrary();
  }
}

const MONSTERS_DATA = [];

function renderMonstersLibrary() {
  const container = document.getElementById('library-monsters-container');
  if (!container) return;

  if (!MONSTERS_DATA || MONSTERS_DATA.length === 0) {
    container.innerHTML = `<p class="empty-state">No monster entries loaded yet.</p>`;
    return;
  }

  container.innerHTML = MONSTERS_DATA.map((section) => {
    return `
      <div class="library-card" id="library-section-${section.id}" style="margin-bottom:12px; background:var(--card-bg, #18181b); border:1px solid var(--border, #27272a); border-radius:8px; overflow:hidden;">
        <div class="accordion-header" onclick="toggleLibraryAccordion('${section.id}')" style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; cursor:pointer; background:rgba(255,255,255,0.02); user-select:none;">
          <div>
            <div style="font-weight:bold; font-size:14px; color:var(--text, #f4f4f5);">${section.title}</div>
            <small style="color:var(--text-muted, #a1a1aa); font-size:11px;">${section.subtitle || ''}</small>
          </div>
          <span id="library-chevron-${section.id}" style="font-size:12px; color:var(--text-muted);">▲</span>
        </div>
        <div id="library-body-${section.id}" class="accordion-content" style="padding:14px; border-top:1px solid var(--border, #27272a); font-size:13px; line-height:1.5;">
          ${section.content}
        </div>
      </div>
    `;
  }).join('');
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

