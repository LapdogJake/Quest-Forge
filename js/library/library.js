// ==============================================================================
// Quest-Forge: Library Compendium & Static Rulebook
// ==============================================================================

const RULES_DATA = [
  {
    id: 'trinkets-rop',
    title: 'Trinkets',
    content: `
      <div class="library-section-body">
        <div style="display:flex; flex-direction:column; gap:10px;">

          <!-- Potion of Barkskin -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Potion of Barkskin</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I drink a potion of barkskin&rdquo;</div>
              <div><strong>M:</strong> A bottle measuring at least two cubic inches.</div>
              <div><strong>E:</strong> Player casts Barkskin (m).</div>
            </div>
          </div>

          <!-- Potion of Refreshment -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Potion of Refreshment</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I drink a potion of refreshment&rdquo;</div>
              <div><strong>M:</strong> A bottle measuring at least two cubic inches.</div>
              <div><strong>E:</strong> Player casts Confidence (m).</div>
            </div>
          </div>

          <!-- Potion of Healing -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Potion of Healing</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I drink a potion of healing&rdquo;</div>
              <div><strong>M:</strong> A bottle measuring at least two cubic inches.</div>
              <div><strong>E:</strong> Player casts Heal (self).</div>
            </div>
          </div>

          <!-- Potion of True Death -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Potion of True Death</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I drink a potion of true death&rdquo;</div>
              <div><strong>M:</strong> A bottle measuring at least two cubic inches.</div>
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
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches.</div>
              <div><strong>E:</strong> Player casts Adaptive Blessing (m).</div>
            </div>
          </div>

          <!-- Scroll of Ambulant -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Scroll of Ambulant</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I read from a scroll of ambulant&rdquo;</div>
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches.</div>
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
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches.</div>
              <div><strong>E:</strong> Player casts Blessing Against Wounds (m).</div>
            </div>
          </div>

          <!-- Scroll of Extension -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Scroll of Extension</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I read from a scroll of extension&rdquo;</div>
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches.</div>
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
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches.</div>
              <div><strong>E:</strong> Player casts Harden (m).</div>
            </div>
          </div>

          <!-- Scroll of Mend -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Scroll of Mend</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> One Use &nbsp;|&nbsp; <strong>R:</strong> Self</div>
              <div><strong>I:</strong> &ldquo;I read from a scroll of mend&rdquo;</div>
              <div><strong>M:</strong> A scroll measuring at least fifteen square inches.</div>
              <div><strong>E:</strong> Player casts Mend (m).</div>
            </div>
          </div>

        </div>
      </div>
    `
  },
  {
    id: 'talismans-rop',
    title: 'Talismans',
    content: `
      <div class="library-section-body">
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
              <div><strong>E:</strong> Further effects which make the player Insubstantial, including effects initiated by the player or beneficial effects, fail as per Planar Grounding. Bearer must announce &ldquo;Immune to insubstantial&rdquo; when this effect is triggered.</div>
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
    title: 'Artifacts',
    content: `
      <div class="library-section-body">
        <div style="display:flex; flex-direction:column; gap:10px;">

          <!-- Ankh of Ran -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--gold); font-size:14px; margin-bottom:4px;">Ankh of Ran</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on while worn</div>
              <div><strong>M:</strong> A white ankh measuring at least twenty-five square inches prominently displayed on garb/equipment, or worn as an amulet.</div>
              <div><strong>E:</strong> Bearer gains Terror (20&prime;) Unlimited (ex). Terror may only be cast on players bearing Undead Minion, Vampirism, or Void Touched, and will affect those players regardless of immunities.</div>
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
              <div><strong>I:</strong> As per Greater Mend.</div>
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
              <div><strong>M:</strong> A double-ended great weapon no longer than 6&prime; or a Magic Staff.</div>
              <div><strong>E:</strong> May be used by any Magic User at no cost to magic points. Grants an additional two magic points at the user's highest level. Magic points gained are not removed regardless of what happens to the staff. Does not count as an Enchantment.</div>
              <div><strong>L:</strong> May only be used by Magic Users.</div>
            </div>
          </div>

          <!-- Phase Blade -->
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--gold); font-size:14px; margin-bottom:4px;">Phase Blade</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              <div><strong>Use:</strong> Always on while carried</div>
              <div><strong>M:</strong> A Short weapon with a gray cover or force-themed decorations. Must have a red and a yellow Enchantment strip tied to it.</div>
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
  },
  {
    id: 'magic-item-rules',
    title: 'Magic Item Rules',
    content: `
      <div class="library-section-body">
        <div style="font-weight:700; color:var(--primary); font-size:13px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">General Rules</div>
        <ol style="margin: 4px 0 16px 20px; padding: 0; font-size: 13px; line-height: 1.6; color: var(--text);">
          <li style="margin-bottom: 8px;">Magical Items each have a category corresponding with their level of power from Trinket to Talisman to Artifact.</li>
          <li style="margin-bottom: 8px;">Magical Items are awarded at the discretion of the group officers.</li>
          <li style="margin-bottom: 8px;">The officers of the group are responsible for tracking what Magic Items are owned by whom.</li>
          <li style="margin-bottom: 8px;">Some Magic Items are one-use only. Magic Items which are used up are no longer available to the player and must be reported to the officers of the group.</li>
          <li style="margin-bottom: 8px;">Ownership of Magical Items resets at the beginning of each reign.</li>
          <li style="margin-bottom: 8px;">Magical Items may only be used by the person to whom they are given initially. Magical Items may not be transferred or traded to another player without the permission of the monarch who awarded them and the reeve of the battlegame.</li>
          <li style="margin-bottom: 8px;">All magical items require the player to carry a copy of the write-up in order to function.</li>
          <li style="margin-bottom: 8px;">Enchantments conferred by Magical Items function exactly as normal (m) Enchantments; they count towards your Enchantment limit, may be removed by Dispel Magic, require a strip, etc.</li>
          <li style="margin-bottom: 8px;">Some Magic Items have a material component requirement. These components must be present in order for the Magic Item to be used and must be verified by the reeve prior to the start of the battlegame. Identical material component requirements may all be served by the same physical object. You do not need a unique bottle for each potion.</li>
          <li style="margin-bottom: 8px;">Magical Items only function at the group level where they were awarded and are unique to that group. For instance, a player who receives a Magical Item at the park level may only use it at that park, but a player who receives a Magical Item at the kingdom level may use it at any park in that kingdom.</li>
          <li style="margin-bottom: 8px;">Magical Items may not be used at interkingdom events unless allowed by the host kingdom.</li>
          <li style="margin-bottom: 8px;">Magic items that may be destroyed cease to function in all ways while destroyed.</li>
          <li style="margin-bottom: 8px;">Uses of abilities granted by a Magic Item are tracked separately from a player's own abilities and are recharged separately.</li>
        </ol>

        <div style="font-weight:700; color:var(--primary); font-size:13px; margin-top:16px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Battlegaming Guidelines</div>
        <p style="margin: 0 0 10px 0; color: var(--text-muted); font-size: 13px; line-height: 1.5;">
          Here are some basic guidelines for how to use Magic Items in battlegames. These guidelines may be changed or adapted by the battlegame reeve. Reeves are always encouraged to consider game balance when determining what Magic Items are allowed in the game.
        </p>
        <ol style="margin: 4px 0 8px 20px; padding: 0; font-size: 13px; line-height: 1.6; color: var(--text);">
          <li style="margin-bottom: 8px;">Magic Items are typically only used in full-class battlegames.</li>
          <li style="margin-bottom: 8px;">The reeve always has the final say over the use or behavior of Magic Items in a battlegame.</li>
          <li style="margin-bottom: 8px;">The reeve for the game has the final say in what Magical Items (if any) are allowed in a battlegame in all situations.</li>
          <li style="margin-bottom: 8px;">Typically, games with fewer than 14 people are limited to Trinkets, games with 15 to 30 people may use up to Talismans, and games with more than 30 people may use Artifacts.</li>
          <li style="margin-bottom: 8px;">A player may use up to one Artifact in a battlegame.</li>
          <li style="margin-bottom: 8px;">A player may use up to two Talismans in a battlegame.</li>
          <li style="margin-bottom: 8px;">A player may use up to three Trinkets in a battlegame.</li>
        </ol>
      </div>
    `
  },
  {
    id: 'quest-abilities',
    title: 'Quest Abilities',
    content: `
      <div class="library-section-body">
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Affinity for Nature</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player is in tune with nature and the beings who live in harmony with nature. This player will generally be considered a friend by such monsters and NPCs. They will also have knowledge about animals and natural locations.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Calm</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player gives off an aura of calm. This player will have an advantage when negotiating or dealing with non-hostile monsters and NPCs.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Charm</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player can initiate a performance that entrances a monster or NPC. The monster will not attack anybody for the duration of the performance or until they feel threatened. The performance must be either a song, a joke, a dance, or a story and may last no longer than 2 minutes. 1/Game.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Court Knowledge</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player is familiar with the customs and behaviors of the royal court. The player will have an advantage when dealing with politicians and nobles.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Disarm Traps</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player has an affinity for mechanical traps. If this player fails to disarm a trap, they fare better than other players.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Hallowed Ground</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player creates a fixed 20&prime;-radius area where no offensive actions can occur for 2 minutes. Actions that are initiated outside the 20&prime; radius may still affect individuals in the area. 1/Game.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Magical Knowledge</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player has experience with reading magical auras. They can detect and identify magical locks and traps. They also have background information about magical beings and locations.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Menace</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player gives off an aura of menace that can be sensed by hostile monsters, and will have an advantage when attempting to intimidate hostile monsters.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Persuasion</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Intelligent monsters and NPCs find the player's arguments more convincing than they otherwise would, and are more likely to be influenced by the player.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Pick Locks</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player has an affinity for mechanical locks. If this player fails an attempt to pick a lock, they fare better than other players.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Presence</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player may converse safely with a group of players, monsters, or NPCs so long as the player takes no hostile action towards them. Monsters and NPCs that are not capable of intelligent thought (animals, slimes, mindless undead, etc.) are not affected. Players may choose not to converse, but may still not harm the player. May not last longer than 3 minutes. May not be used for scouting or reconnaissance. 1/Game.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Talk to Dead</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Dead players, intelligent monsters, and intelligent NPCs can be asked one yes-or-no question and must answer truthfully to the best of their ability. May only be used once per target.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Tracker</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player is an experienced tracker in almost any environment. The player will often be able to determine more information about the kinds of monsters and NPCs in the area, as well as possible locations of game objectives.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Tribal Knowledge</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player is familiar with the tribal and clan customs of many cultures. This player will have an edge in understanding and negotiating with monsters and NPCs who live in a clan or tribe.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Turn Undead</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Monster and NPC undead (including monsters and NPCs affected by Undead Minion, Vampirism, etc.) must stay 50&prime; away from the player and may not initiate any hostile actions towards them. Any undead that is targeted by a hostile action is no longer affected by Turn Undead and may act normally. Lasts for 2 minutes. 1/Game.
            </div>
          </div>
          <div style="background:#121214; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:bold; color:var(--primary); font-size:14px; margin-bottom:4px;">Prepared</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text);">
              Player is an experienced campaigner and is aware, before a Quest starts, of any special equipment or circumstances that may be encountered. The reeve in charge of the Quest should privately give the player a brief overview of the monsters and challenges they are likely to encounter.
            </div>
          </div>
        </div>
      </div>
    `
  }
];

const LIBRARY_DATA = RULES_DATA;

// Render the Rules Tab content (combining items, magic item rules, and abilities)
function renderRulesLibrary() {
  const container = document.getElementById('library-rules-container') || document.getElementById('library-content-container');
  if (!container) return;

  container.innerHTML = RULES_DATA.map((section) => {
    return `
      <details class="store-category" id="library-section-${section.id}">
        <summary class="store-category-summary">${section.title}</summary>
        <div class="store-category-items">
          ${section.content}
        </div>
      </details>
    `;
  }).join('');
}

const renderLibrary = function() {
  if (typeof renderChroniclesLibrary === 'function') renderChroniclesLibrary();
  if (typeof renderRulesLibrary === 'function') renderRulesLibrary();
};
const renderAbilitiesLibrary = renderRulesLibrary;

// Sub-tab switching between Chronicles and Rules
function switchLibrarySubTab(subTab) {
  const isChronicles = subTab === 'chronicles' || subTab === 'archive' || subTab === 'misc' || subTab === 'monsters' || subTab === 'durability';
  const isRules = !isChronicles && (subTab === 'rules' || subTab === 'items' || subTab === 'abilities');

  const chroniclesContainer = document.getElementById('library-subtab-chronicles') || document.getElementById('library-subtab-archive') || document.getElementById('library-subtab-misc');
  const rulesContainer = document.getElementById('library-subtab-rules') || document.getElementById('library-subtab-items');

  const btnChronicles = document.getElementById('library-subnav-chronicles') || document.getElementById('library-subnav-archive') || document.getElementById('library-subnav-misc');
  const btnRules = document.getElementById('library-subnav-rules') || document.getElementById('library-subnav-items');

  if (chroniclesContainer) chroniclesContainer.classList.toggle('hidden', !isChronicles);
  if (rulesContainer) rulesContainer.classList.toggle('hidden', !isRules);

  if (btnChronicles) btnChronicles.classList.toggle('active', isChronicles);
  if (btnRules) btnRules.classList.toggle('active', isRules);

  if (isChronicles) {
    if (typeof renderChroniclesLibrary === 'function') renderChroniclesLibrary();
    if (typeof fetchChronicles === 'function') fetchChronicles();
  } else if (isRules) {
    if (typeof renderRulesLibrary === 'function') renderRulesLibrary();
  }
}

// Toggle individual accordion sections (supports both details and legacy accordion)
function toggleLibraryAccordion(sectionId) {
  const detailsEl = document.getElementById(`library-section-${sectionId}`);
  if (detailsEl && detailsEl.tagName === 'DETAILS') {
    detailsEl.open = !detailsEl.open;
    return;
  }
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

// Pre-render rules once DOM is ready so contents are immediately accessible
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof renderRulesLibrary === 'function') renderRulesLibrary();
    });
  } else {
    if (typeof renderRulesLibrary === 'function') renderRulesLibrary();
  }
}
