// ==============================================================================
// Quest-Forge: Player Battle Tab (Heroes Line, Monster Line, & Battle Cards)
// ==============================================================================

async function fetchMonsterEncounters() {
  // Delegate directly to fetchQuests() which manages the live unified combat board (#available-combat-quests)
  if (typeof fetchQuests === 'function') {
    return await fetchQuests();
  }
}

// Fetch live queue rosters and render the Player Battle Tab (#available-combat-quests)
async function renderBattleBoard(combatQuests, myQueueMemberships, activePark, activeQMName) {
  const combatContainer = document.getElementById('available-combat-quests');
  if (!combatContainer) return;

  const joinedQueueMap = new Map();
  (myQueueMemberships || []).forEach(m => {
    const queue = m.quest_queues;
    const quest = queue?.quests;
    if (!queue || !quest || queue.status === 'completed') return;
    if (quest.category === 'Battle' || quest.category === 'Combat') {
      joinedQueueMap.set(quest.id, queue.id);
    }
  });

  const combatQuestIds = (combatQuests || []).map(q => q.id);
  const queueRosterByQuest = new Map();

  if (combatQuestIds.length > 0) {
    const { data: queuedBattleLines } = await supabaseClient
      .from('quest_queues')
      .select('id, quest_id, status, queue_members(*, profiles(id, username, quest_abilities)), encounter_monsters(*, profiles(id, username, quest_abilities))')
      .in('quest_id', combatQuestIds)
      .in('status', ['waiting', 'active']);

    (queuedBattleLines || []).forEach(line => {
      if (!line || !line.quest_id) return;
      const heroRoster = (line.queue_members || []).map(member => ({
        username: member.profiles?.username || 'Hero',
        abilities: member.profiles?.quest_abilities || []
      })).filter(m => Boolean(m.username));

      const monsterRoster = (line.encounter_monsters || []).map(member => ({
        username: member.profiles?.username || 'Monster',
        abilities: member.profiles?.quest_abilities || []
      })).filter(m => Boolean(m.username));

      const userHeroMember = (line.queue_members || []).find(m => m.user_id === currentUser.id || m.profiles?.id === currentUser.id);
      const userMonsterMember = (line.encounter_monsters || []).find(m => m.user_id === currentUser.id || m.profiles?.id === currentUser.id);

      queueRosterByQuest.set(line.quest_id, {
        queueId: line.id,
        queueStatus: line.status,
        heroPlayers: heroRoster,
        monsterPlayers: monsterRoster,
        joinedHeroQueueId: userHeroMember ? line.id : null,
        joinedMonsterClaimId: userMonsterMember ? userMonsterMember.id : null
      });
    });
  }

  const openCardIds = new Set(
    Array.from(combatContainer.querySelectorAll('details.battle-accordion[open], details.battle-card[open]'))
      .map(el => el.getAttribute('data-quest-id'))
      .filter(Boolean)
  );

  combatContainer.innerHTML = combatQuests.length > 0
    ? combatQuests.map(q => renderBattleQuestCard(q, joinedQueueMap.get(q.id), queueRosterByQuest.get(q.id), openCardIds.has(q.id))).join('')
    : `<p class="empty-state">No Active Battle in ${activePark} (${activeQMName}).</p>`;
}

function renderMonsterQuestCard(q, activeMonsterClaim, monsterRoster = null, isBattleLocked = false) {
  if (typeof renderBattleQuestCard === 'function') {
    return renderBattleQuestCard(q, null, monsterRoster, false);
  }
  return '';
}

// Render a Battle Card on the Player Battle Tab (#available-combat-quests)
function renderBattleQuestCard(q, joinedQueueId = null, queueRoster = null, isCardOpen = false) {
  const isSlotLocked = Boolean(activeBattleQuest || activeMonsterClaim);
  const rules = typeof getQuestDurabilityRules === 'function'
    ? getQuestDurabilityRules(q)
    : { allowedTypes: ['Trinket', 'Talisman', 'Artifact'], monstersAreNpc: false, defeatGold: 0 };
  const victoryGold = Number(q.reward_gold) || 0;
  const defeatGold = Number(q.reward_gold_defeat) || Number(rules.defeatGold) || 0;

  const heroPlayers = queueRoster?.heroPlayers || [];
  const monsterPlayers = queueRoster?.monsterPlayers || [];
  const joinedHeroQueueId = queueRoster?.joinedHeroQueueId || joinedQueueId;
  const joinedMonsterClaimId = queueRoster?.joinedMonsterClaimId || (activeMonsterClaim && activeMonsterClaim.quest_queues?.quest_id === q.id ? activeMonsterClaim.id : null);

  const isJoinedHero = Boolean(joinedHeroQueueId);
  const isJoinedMonster = Boolean(joinedMonsterClaimId);
  const isLive = queueRoster?.queueStatus === 'active';
  const isOpen = Boolean(isCardOpen);

  const statusBadge = isLive
    ? '<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; padding:2px 4px; border:none;">🟠 Live</span>'
    : (q.is_active || queueRoster
      ? '<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; padding:2px 4px; border:none;">🟢 Open</span>'
      : '<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; padding:2px 4px; border:none;">⚪ Closed</span>');

  return `
    <details class="quest-accordion battle-accordion" data-quest-id="${q.id}" ${isOpen ? 'open' : ''}>
      <summary>
        <span class="quest-summary-title">${q.title}</span>
        <span class="quest-summary-actions">
          ${statusBadge}
        </span>
      </summary>
      <div class="quest-accordion-content">
        <!-- 1. The Queue Lines on top -->
        <div class="dual-queue-grid" style="margin-top:4px; margin-bottom:12px;">
          <!-- HEROES COLUMN (Left) -->
          <div class="queue-box hero-box ${isJoinedHero ? 'joined-active' : ''}">
            <div>
              <div class="queue-header-row">
                <h5 class="queue-header-title" style="color:#38bdf8;">Heroes</h5>
                <span class="queue-count-pill" style="color:#38bdf8; border:1px solid rgba(56,189,248,0.3);">${heroPlayers.length}</span>
              </div>
              <div class="queue-roster-list">
                ${heroPlayers.length > 0
                  ? heroPlayers.map(p => {
                      const name = typeof p === 'object' ? p.username : p;
                      const abs = (typeof p === 'object' && Array.isArray(p.abilities)) ? p.abilities : [];
                      const isMe = currentUser && (name === currentProfile?.username || name === currentUser.username);
                      const absBadge = (rules.monstersAreNpc && abs.length > 0)
                        ? abs.map(a => `<span class="ability-pill">${a}</span>`).join('')
                        : '';
                      return `<span class="party-member-tag ${isMe ? 'is-current-user' : ''}">👤 ${name}${absBadge}</span>`;
                    }).join('')
                  : '<p style="font-size:11px; color:#64748b; margin:6px 0; font-style:italic; text-align:center;">Line is empty.</p>'}
              </div>
            </div>

            <!-- Big Fat-Finger Hero Button -->
            <div>
              ${isLive ? (
                isJoinedHero ? `
                  <button class="btn-battle-action btn-battle-hero" disabled style="opacity:0.95; cursor:default;">
                    IN COMBAT
                  </button>
                ` : (rules.allowMidJoin ? (isSlotLocked ? `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    ${isJoinedMonster ? 'IN MONSTERS' : 'SLOT FULL'}
                  </button>
                ` : `
                  <button class="btn-battle-action btn-battle-hero" onclick="joinOrCreateGroupQueue('${q.id}')">
                    JOIN
                  </button>
                `) : `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    BATTLE LIVE
                  </button>
                `)
              ) : (
                isJoinedHero ? `
                  <button class="btn-battle-action btn-battle-leave" onclick="leaveQueue('${joinedHeroQueueId}')">
                    LEAVE
                  </button>
                ` : (isSlotLocked ? `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    ${isJoinedMonster ? 'IN MONSTERS' : 'SLOT FULL'}
                  </button>
                ` : `
                  <button class="btn-battle-action btn-battle-hero" onclick="joinOrCreateGroupQueue('${q.id}')">
                    JOIN
                  </button>
                `)
              )}
            </div>
          </div>

          <!-- MONSTERS COLUMN (Right) -->
          <div class="queue-box monster-box ${isJoinedMonster ? 'joined-active' : ''}">
            <div>
              <div class="queue-header-row">
                <h5 class="queue-header-title" style="color:#f43f5e;">Monsters</h5>
                <span class="queue-count-pill" style="color:#f43f5e; border:1px solid rgba(244,63,94,0.3);">${monsterPlayers.length}</span>
              </div>
              <div class="queue-roster-list">
                ${monsterPlayers.length > 0
                  ? monsterPlayers.map(p => {
                      const name = typeof p === 'object' ? p.username : p;
                      const abs = (typeof p === 'object' && Array.isArray(p.abilities)) ? p.abilities : [];
                      const isMe = currentUser && (name === currentProfile?.username || name === currentUser.username);
                      const absBadge = (rules.monstersAreNpc && abs.length > 0)
                        ? abs.map(a => `<span class="ability-pill" style="border-color:rgba(244,63,94,0.4); color:#fda4af; background:rgba(244,63,94,0.15);">${a}</span>`).join('')
                        : '';
                      return `<span class="party-member-tag ${isMe ? 'is-current-user' : ''}" style="border-color:rgba(244,63,94,0.3);">👤 ${name}${absBadge}</span>`;
                    }).join('')
                  : '<p style="font-size:11px; color:#64748b; margin:6px 0; font-style:italic; text-align:center;">Line is empty.</p>'}
              </div>
            </div>

            <!-- Big Fat-Finger Monster Button -->
            <div>
              ${isLive ? (
                isJoinedMonster ? `
                  <button class="btn-battle-action btn-battle-monster" disabled style="opacity:0.95; cursor:default;">
                    IN COMBAT
                  </button>
                ` : (rules.allowMidJoin ? (isSlotLocked ? `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    ${isJoinedHero ? 'IN HEROES' : 'SLOT FULL'}
                  </button>
                ` : `
                  <button class="btn-battle-action btn-battle-monster" onclick="claimMonsterRole('${q.id}', 'Standard Monster')">
                    JOIN
                  </button>
                `) : `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    BATTLE LIVE
                  </button>
                `)
              ) : (
                isJoinedMonster ? `
                  <button class="btn-battle-action btn-battle-leave" onclick="abandonMonsterRole('${joinedMonsterClaimId}')">
                    LEAVE
                  </button>
                ` : (isSlotLocked ? `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    ${isJoinedHero ? 'IN HEROES' : 'SLOT FULL'}
                  </button>
                ` : `
                  <button class="btn-battle-action btn-battle-monster" onclick="claimMonsterRole('${q.id}', 'Standard Monster')">
                    JOIN
                  </button>
                `)
              )}
            </div>
          </div>
        </div>

        <!-- 2. The Badges below the Queue lines -->
        <div class="tag-container" style="margin-bottom:10px;">
          <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold); font-weight:bold;">+${victoryGold}g Win</span>
          <span class="badge badge-type" style="color:#94a3b8; border-color:#64748b;">+${defeatGold}g Loss</span>
          ${rules.durabilityWear === 0
            ? '<span class="badge badge-active">No Gear Wear</span>'
            : (rules.durabilityWear === 2
              ? '<span class="badge badge-threat-loot">2x Gear Wear</span>'
              : (rules.durabilityWear >= 3
                ? `<span class="badge badge-threat-loot">${rules.durabilityWear}x Gear Wear</span>`
                : ''))}
          ${rules.defeatPenalty === 'items_lost'
            ? '<span class="badge badge-monster" style="background:#b91c1c; color:white; font-weight:bold;">Items Lost</span>'
            : (rules.defeatPenalty === 'total_ruin'
              ? '<span class="badge badge-monster" style="background:#7f1d1d; border:1px solid #ef4444; color:white; font-weight:bold;">Total Ruin</span>'
              : '')}
          ${rules.monstersAreNpc
            ? '<span class="badge badge-monster" title="Monster queue does not lose durability">Monsters are NPCs</span>'
            : ''}
          ${rules.allowMidJoin
            ? '<span class="badge badge-active" style="background:#0284c7; color:white; border-color:#38bdf8;">Mid-Battle Joining</span>'
            : ''}
          ${rules.allowedTypes.length === 3
            ? '<span class="badge badge-active">All Items Active</span>'
            : (rules.allowedTypes.length === 0
              ? '<span class="badge badge-threat-loot">No Magic Items</span>'
              : `<span class="badge badge-type">${rules.allowedTypes.join(', ')}</span>`)}
          ${q.repeatable ? '<span class="badge badge-quest">Repeatable</span>' : ''}
          ${rules.rngLootDrops ? '<span class="badge badge-threat-loot" style="background:#7c3aed; color:white; border-color:#a855f7;">RNG Loot</span>' : ''}
        </div>

        <!-- 3. The Description text under the Badges -->
        ${q.description ? `<p style="font-size:13px; color:#cbd5e1; margin:0 0 6px 0; line-height:1.45;">${q.description}</p>` : ''}
      </div>
    </details>
  `;
}

// ------------------------------------------------------------------------------
// Player Battle Queue Actions (Heroes Line & Monster Line)
// ------------------------------------------------------------------------------

async function joinOrCreateGroupQueue(questId) {
  if (activeBattleQuest || activeMonsterClaim) {
    alert("⚠️ Your Battle Slot is already occupied!");
    return;
  }

  const { data: questRow } = await supabaseClient.from('quests').select('*').eq('id', questId).maybeSingle();
  const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(questRow) : { allowMidJoin: false };

  const { data: existingQueues } = await supabaseClient
    .from('quest_queues')
    .select('*')
    .eq('quest_id', questId)
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingQueues && existingQueues.length > 0 && existingQueues[0].status === 'active' && !rules.allowMidJoin) {
    alert("⚠️ This battle is currently active in combat! You cannot join or switch sides while the battle is live.");
    return;
  }

  let queueId = null;

  if (existingQueues && existingQueues.length > 0 && (existingQueues[0].status === 'waiting' || existingQueues[0].status === 'active')) {
    queueId = existingQueues[0].id;
  } else {
    const { data: newQueue, error } = await supabaseClient
      .from('quest_queues')
      .insert({ quest_id: questId, leader_id: currentUser.id, status: 'waiting' })
      .select()
      .single();

    if (error) { alert("Error opening line: " + error.message); return; }
    queueId = newQueue.id;
  }

  const { error: joinError } = await supabaseClient
    .from('queue_members')
    .insert({ queue_id: queueId, user_id: currentUser.id });

  if (joinError && !joinError.message.includes('duplicate')) {
    alert("Error joining line: " + joinError.message);
    return;
  }

  alert("⚔️ Joined Heroes Line!");
  await fetchUserSlotState();
  fetchQuests();
  if (currentProfile?.role === 'questmaster' || currentProfile?.role === 'admin') {
    fetchQMQueues();
  }
}

async function leaveQueue(queueId) {
  await supabaseClient.from('queue_members').delete().eq('queue_id', queueId).eq('user_id', currentUser.id);
  await fetchUserSlotState();
  fetchQuests();
  if (currentProfile?.role === 'questmaster' || currentProfile?.role === 'admin') {
    fetchQMQueues();
  }
}

async function claimMonsterRole(questId, roleName) {
  if (activeBattleQuest || activeMonsterClaim) {
    alert("⚠️ Your Battle Slot is already occupied by a Combat quest or another Monster assignment!");
    return;
  }

  const { data: questRow } = await supabaseClient.from('quests').select('*').eq('id', questId).maybeSingle();
  const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(questRow) : { allowMidJoin: false };

  const { data: existingQueues } = await supabaseClient
    .from('quest_queues')
    .select('*')
    .eq('quest_id', questId)
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingQueues && existingQueues.length > 0 && existingQueues[0].status === 'active' && !rules.allowMidJoin) {
    alert("⚠️ This battle is currently active in combat! You cannot join or switch sides while the battle is live.");
    return;
  }

  let queueId = null;

  if (existingQueues && existingQueues.length > 0 && (existingQueues[0].status === 'waiting' || existingQueues[0].status === 'active')) {
    queueId = existingQueues[0].id;
  } else {
    const { data: newQueue, error: queueError } = await supabaseClient
      .from('quest_queues')
      .insert({ quest_id: questId, status: 'waiting' })
      .select()
      .single();

    if (queueError) { alert("Error opening encounter line: " + queueError.message); return; }
    queueId = newQueue.id;
  }

  const { error } = await supabaseClient.from('encounter_monsters').insert({
    queue_id: queueId,
    user_id: currentUser.id,
    role_name: roleName,
    status: 'claimed'
  });

  if (error) { alert("Error joining monster line: " + error.message); return; }

  alert("👹 Joined Monster Line!");
  await fetchUserSlotState();
  fetchMonsterEncounters();
  fetchQuests();
  if (currentProfile?.role === 'questmaster' || currentProfile?.role === 'admin') {
    fetchQMQueues();
  }
}

async function abandonMonsterRole(claimId) {
  await supabaseClient.from('encounter_monsters').delete().eq('id', claimId);
  await fetchUserSlotState();
  fetchMonsterEncounters();
  fetchQuests();
  if (currentProfile?.role === 'questmaster' || currentProfile?.role === 'admin') {
    fetchQMQueues();
  }
}

