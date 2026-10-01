// ==============================================================================
// Quest-Forge: Quest Slots, Cards, Acceptance, & Forge Catalog
// ==============================================================================

async function fetchUserSlotState() {
  if (!currentUser) return;

  const { data: userQuests } = await supabaseClient
    .from('user_quests')
    .select('*, quests(*)')
    .eq('user_id', currentUser.id)
    .eq('status', 'accepted');

  const { data: queueMemberships } = await supabaseClient
    .from('queue_members')
    .select('queue_id, quest_queues(*, quests(*))')
    .eq('user_id', currentUser.id);

  const { data: monsterClaims } = await supabaseClient
    .from('encounter_monsters')
    .select('*, quest_queues(*, quests(*))')
    .eq('user_id', currentUser.id)
    .eq('status', 'claimed');

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId;

  activeMonsterClaim = (monsterClaims && monsterClaims.length > 0) 
    ? (monsterClaims.find(mc => {
        const q = mc.quest_queues?.quests;
        return (!q?.park || q?.park === activePark) && (!q?.qm_id || !activeQMId || q?.qm_id === activeQMId);
      }) || null)
    : null;

  // Auto-cleanup any orphan user_quests for quests that have been closed or deactivated by QM
  const orphanQuestIds = userQuests?.filter(uq => !uq.quests || uq.quests.is_active === false).map(uq => uq.id) || [];
  if (orphanQuestIds.length > 0) {
    await supabaseClient.from('user_quests').delete().in('id', orphanQuestIds);
  }

  const activeSoloBattle = userQuests?.find(uq => uq.quests?.is_active && (!uq.quests?.park || uq.quests?.park === activePark) && (!uq.quests?.qm_id || !activeQMId || uq.quests?.qm_id === activeQMId) && (uq.quests?.category === 'Battle' || uq.quests?.category === 'Combat'));
  const activeGroupBattle = queueMemberships?.find(qm => {
    const queue = qm.quest_queues;
    const quest = queue?.quests;
    return (queue?.status !== 'completed') && quest?.is_active && (!quest?.park || quest?.park === activePark) && (!quest?.qm_id || !activeQMId || quest?.qm_id === activeQMId) && (quest?.category === 'Battle' || quest?.category === 'Combat');
  });

  activeBattleQuest = activeSoloBattle || activeGroupBattle;
  activeLarpieQuest = userQuests?.find(uq => uq.quests?.is_active && (!uq.quests?.park || uq.quests?.park === activePark) && (!uq.quests?.qm_id || !activeQMId || uq.quests?.qm_id === activeQMId) && (uq.quests?.category === 'Adventure' || (uq.quests?.category !== 'Battle' && uq.quests?.category !== 'Combat')));

  const battleStatusEl = document.getElementById('slot-battle-status');
  const larpieStatusEl = document.getElementById('slot-larpie-status');

  if (battleStatusEl) {
    if (activeMonsterClaim) {
      battleStatusEl.innerText = "Monster";
      battleStatusEl.className = "slot-status slot-occupied";
    } else if (activeBattleQuest) {
      battleStatusEl.innerText = "Hero";
      battleStatusEl.className = "slot-status slot-occupied";
    } else {
      battleStatusEl.innerText = "🟢 Available";
      battleStatusEl.className = "slot-status slot-free";
    }
  }

  if (larpieStatusEl) {
    if (activeLarpieQuest) {
      larpieStatusEl.innerText = activeLarpieQuest.quests?.title || 'Quest Active';
      larpieStatusEl.className = "slot-status slot-occupied";
    } else {
      larpieStatusEl.innerText = "🟢 Available";
      larpieStatusEl.className = "slot-status slot-free";
    }
  }
}

// Fetch Public Board Quests for Heroes and Adventure Tabs
async function fetchQuests() {
  const combatContainer = document.getElementById('available-combat-quests');
  const larpieContainer = document.getElementById('available-larpie-quests');

  if (!currentUser) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId;
  const activeQMName = typeof getActiveQMUsername === 'function' ? getActiveQMUsername() : 'Default Realm';

  const { data: userQuests } = await supabaseClient
    .from('user_quests')
    .select('*, quests(*)')
    .eq('user_id', currentUser.id);

  const { data: myQueueMemberships } = await supabaseClient
    .from('queue_members')
    .select('queue_id, quest_queues(*, quests(*))')
    .eq('user_id', currentUser.id);

  const activeQuestIds = userQuests ? userQuests.filter(uq => uq.status === 'accepted').map(uq => uq.quest_id) : [];
  const completedQuestIds = userQuests ? userQuests.filter(uq => uq.status === 'completed').map(uq => uq.quest_id) : [];

  const activeAdventureQuests = userQuests
    ? userQuests.filter(uq => uq.status === 'accepted' && uq.quests && (!uq.quests.park || uq.quests.park === activePark) && (!uq.quests.qm_id || !activeQMId || uq.quests.qm_id === activeQMId) && (uq.quests.category === 'Adventure' || (uq.quests.category !== 'Battle' && uq.quests.category !== 'Combat')))
    : [];

  const { data: allQuests } = await supabaseClient
    .from('quests')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Filter available quests strictly by the player's active park AND active QM reign
  const parkQuests = (allQuests || []).filter(q => 
    (!q.park || q.park === activePark) &&
    (!q.qm_id || !activeQMId || q.qm_id === activeQMId)
  );

  if (!parkQuests || parkQuests.length === 0) {
    if (combatContainer) combatContainer.innerHTML = `<p class="empty-state">No Active Battles in ${activePark} (${activeQMName}).</p>`;
    if (larpieContainer) {
      const activeAdvHtml = activeAdventureQuests.map(uq => renderActiveAdventureQuestCard(uq)).join('');
      larpieContainer.innerHTML = activeAdvHtml.length > 0 ? activeAdvHtml : `<p class="empty-state">No Active Quests in ${activePark} (${activeQMName}).</p>`;
    }
    return;
  }

  const available = parkQuests.filter(q => !activeQuestIds.includes(q.id) && (q.repeatable || !completedQuestIds.includes(q.id)));

  const combatQuests = available.filter(q => q.category === 'Battle' || q.category === 'Combat');
  const larpieQuests = available.filter(q => q.category === 'Adventure' || q.category === 'Quest' || (q.category !== 'Battle' && q.category !== 'Combat'));

  const joinedQueueMap = new Map();
  (myQueueMemberships || []).forEach(m => {
    const queue = m.quest_queues;
    const quest = queue?.quests;
    if (!queue || !quest || queue.status === 'completed') return;
    if (quest.category === 'Battle' || quest.category === 'Combat') {
      joinedQueueMap.set(quest.id, queue.id);
    }
  });

  const combatQuestIds = combatQuests.map(q => q.id);
  let queueRosterByQuest = new Map();

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

  const combatHeading = document.getElementById('available-combat-heading');
  if (combatHeading) {
    combatHeading.classList.toggle('hidden', combatQuests.length === 0);
  }

  if (combatContainer) {
    combatContainer.innerHTML = combatQuests.length > 0
      ? combatQuests.map(q => renderAvailableQuestCard(q, 'combat', joinedQueueMap.get(q.id), queueRosterByQuest.get(q.id))).join('')
      : `<p class="empty-state">No Active Battles in ${activePark} (${activeQMName}).</p>`;
  }

  if (larpieContainer) {
    const larpieQuestIds = larpieQuests.map(q => q.id);
    const questUsageMap = new Map();

    if (larpieQuestIds.length > 0) {
      const { data: usageData } = await supabaseClient
        .from('user_quests')
        .select('quest_id, status')
        .in('quest_id', larpieQuestIds)
        .in('status', ['accepted', 'completed']);

      (usageData || []).forEach(u => {
        if (!questUsageMap.has(u.quest_id)) {
          questUsageMap.set(u.quest_id, { active: 0, completed: 0 });
        }
        const item = questUsageMap.get(u.quest_id);
        if (u.status === 'accepted') item.active++;
        else if (u.status === 'completed') item.completed++;
      });
    }

    const activeAdvHtml = activeAdventureQuests.map(uq => renderActiveAdventureQuestCard(uq)).join('');
    const availAdvHtml = larpieQuests.map(q => renderAvailableQuestCard(q, 'larpie', null, null, questUsageMap.get(q.id))).join('');
    const totalAdvHtml = activeAdvHtml + availAdvHtml;

    larpieContainer.innerHTML = totalAdvHtml.length > 0
      ? totalAdvHtml
      : `<p class="empty-state">No Active Quests.</p>`;
  }
}

async function abandonQuest(userQuestId) {
  await supabaseClient.from('user_quests').update({ status: 'abandoned' }).eq('id', userQuestId);
  await fetchUserSlotState();
  await fetchQuests();
}

function renderActiveAdventureQuestCard(uq) {
  const q = uq.quests;
  if (!q) return '';
  const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(q) : { verificationMethod: 'Quest Master' };
  const isQMVerified = rules.verificationMethod === 'Quest Master';
  const groupType = q.participation_type || 'Solo';
  const rewardGold = q.reward_gold || 0;

  const summaryActions = isQMVerified
    ? `
      <span class="quest-summary-actions">
        <button class="btn-leave" onclick="abandonQuest('${uq.id}')">Abandon</button>
      </span>
    `
    : `
      <span class="quest-summary-actions">
        <button class="btn-leave" onclick="abandonQuest('${uq.id}')">Abandon</button>
        <button class="btn-complete" onclick="completeQuest('${uq.id}', ${rewardGold})">Complete</button>
      </span>
    `;

  return `
    <details class="quest-accordion quest-joined" open>
      <summary>
        <span class="quest-summary-title">${q.title}</span>
        ${summaryActions}
      </summary>
      <div class="quest-accordion-content">
        <div class="quest-details-body">
          <div class="quest-details-panel">
            <div class="tag-container">
              <span class="badge badge-quest">Quest</span>
              <span class="badge badge-type">${groupType}</span>
              <span class="badge badge-active">Active on Field</span>
              ${isQMVerified ? '<span class="badge badge-threat-loot" style="background:#0284c7; color:white; border-color:#38bdf8;">👑 QM Verification Needed</span>' : '<span class="badge badge-type">🤝 Self-Complete</span>'}
            </div>
            ${q.requirements ? `<p style="color:var(--warning); font-size:12px; margin-bottom:4px;"><strong>Req:</strong> ${q.requirements}</p>` : ''}
            <p>${q.description || ''}</p>
            <div class="quest-rewards" style="margin-bottom:8px;">
              <span class="reward-gold">🪙 +${rewardGold} Gold</span>
            </div>
            ${isQMVerified ? `
              <div style="background:rgba(2, 132, 199, 0.12); border:1px solid rgba(56, 189, 248, 0.35); border-radius:6px; padding:8px 10px; font-size:12px; color:#bae6fd; display:flex; align-items:center; gap:6px;">
                <span>🛡️</span>
                <span><strong>Awaiting QM Turn-in:</strong> Complete this objective on the field and report to your Questmaster to verify and claim your gold!</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </details>
  `;
}

function renderSoloQuestCard(q, isActive, userQuestId) {
  if (!q) return '';
  const isBattle = q.category === 'Battle' || q.category === 'Combat';
  const rewardGold = q.reward_gold || 0;
  const groupType = q.participation_type || 'Solo';

  return `
    <div class="quest-card" style="border-left: 4px solid var(--quest);">
      <div class="tag-container">
        <span class="badge ${isBattle ? 'badge-battle' : 'badge-quest'}">${isBattle ? 'Battle' : 'Quest'}</span>
        <span class="badge badge-type">${groupType}</span>
        <span class="badge badge-active">Active</span>
      </div>
      <h4>${q.title}</h4>
      ${q.requirements ? `<p style="color:var(--warning); font-size:12px; margin-bottom:4px;"><strong>Req:</strong> ${q.requirements}</p>` : ''}
      <p>${q.description || ''}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
        <div class="quest-rewards">
          <span class="reward-gold">🪙 +${rewardGold} Gold</span>
        </div>
        <button class="btn-complete" onclick="completeQuest('${userQuestId}', ${rewardGold})">Complete</button>
      </div>
    </div>
  `;
}

function renderGroupQueueCard(q, queue, members) {
  const isStatusActive = queue.status === 'active';
  return `
    <div class="quest-card" style="border:1px solid var(--primary);">
      <div class="tag-container">
        <span class="badge badge-battle">Battle</span>
        <span class="badge badge-type">Group</span>
        <span class="badge ${isStatusActive ? 'badge-active' : 'badge-threat-loot'}">
          ${isStatusActive ? '⚔️ Encounter Live!' : '⏳ Waiting in Queue'}
        </span>
      </div>
      <h4>${q.title}</h4>
      <p>${q.description || ''}</p>
      <div class="queue-box" style="margin-top:10px;">
        <h5>Registered PC Squad (${members.length}):</h5>
        <div>${members.map(m => `<span class="party-member-tag">👤 ${m}</span>`).join('')}</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
        <div class="quest-rewards">
          <span class="reward-gold">🪙 +${q.reward_gold} Gold</span>
        </div>
        <button class="btn-secondary" onclick="leaveQueue('${queue.id}')">Leave Line</button>
      </div>
    </div>
  `;
}

function renderAvailableQuestCard(q, type, joinedQueueId = null, queueRoster = null, questUsage = null) {
  const isCombat = type === 'combat';
  const isAdventure = type === 'larpie';
  const isSlotLocked = isCombat ? (!!activeBattleQuest || !!activeMonsterClaim) : !!activeLarpieQuest;

  if (isCombat) {
    const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(q) : { allowedTypes: ['Trinket', 'Talisman', 'Artifact'], monstersAreNpc: false, defeatGold: 0 };
    const victoryGold = Number(q.reward_gold) || 0;
    const defeatGold = Number(q.reward_gold_defeat) || Number(rules.defeatGold) || 0;

    const heroPlayers = queueRoster?.heroPlayers || [];
    const monsterPlayers = queueRoster?.monsterPlayers || [];
    const joinedHeroQueueId = queueRoster?.joinedHeroQueueId || joinedQueueId;
    const joinedMonsterClaimId = queueRoster?.joinedMonsterClaimId || (activeMonsterClaim && activeMonsterClaim.quest_queues?.quest_id === q.id ? activeMonsterClaim.id : null);
    
    const isJoinedHero = Boolean(joinedHeroQueueId);
    const isJoinedMonster = Boolean(joinedMonsterClaimId);
    const isLive = queueRoster?.queueStatus === 'active';
    const isQMUser = Boolean(currentUser && (currentQMId === currentUser.id || currentProfile?.role === 'questmaster' || currentProfile?.role === 'admin'));

    const scenarioClean = (q.scenario_card || '').replace(/<!--\s*RULES:.*?-->/gs, '').trim();

    const isHighStakes = rules.defeatPenalty === 'items_lost' || rules.defeatPenalty === 'total_ruin';
    const highStakesBorder = rules.defeatPenalty === 'total_ruin' ? '#ef4444' : '#b91c1c';
    const cardBorder = isLive ? '#dc2626' : (isJoinedHero || isJoinedMonster ? 'var(--gold)' : (isHighStakes ? highStakesBorder : 'rgba(255,255,255,0.12)'));

    return `
      <div class="quest-card battle-card" style="border: 2px solid ${cardBorder}; margin-bottom:16px;">
        <!-- Header & Status Badges -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px;">
          <div>
            <h4 style="margin:0 0 4px 0; font-size:17px; font-weight:800; letter-spacing:0.3px;">⚔️ ${q.title}</h4>
            <div class="tag-container" style="margin-bottom:0;">
              <span class="badge badge-battle" style="background:#dc2626; color:white;">⚔️ Battle</span>
              <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold); font-weight:bold;">🏆 +${victoryGold}g Win</span>
              <span class="badge badge-type" style="color:#94a3b8; border-color:#64748b;">💀 +${defeatGold}g Loss</span>
              ${rules.durabilityWear === 0 
                ? '<span class="badge badge-active">🛡️ No Gear Wear</span>' 
                : (rules.durabilityWear === 2 
                  ? '<span class="badge badge-threat-loot">🔥 2x Gear Wear</span>' 
                  : (rules.durabilityWear >= 3 
                    ? `<span class="badge badge-threat-loot">💥 ${rules.durabilityWear}x Gear Wear</span>` 
                    : ''))}
              ${rules.defeatPenalty === 'items_lost' 
                ? '<span class="badge badge-monster" style="background:#b91c1c; color:white; font-weight:bold;">💀 Items Lost</span>' 
                : (rules.defeatPenalty === 'total_ruin' 
                  ? '<span class="badge badge-monster" style="background:#7f1d1d; border:1px solid #ef4444; color:white; font-weight:bold;">☠️ Total Ruin</span>' 
                  : '')}
              ${rules.monstersAreNpc 
                ? '<span class="badge badge-monster" title="Monster queue does not lose durability">👹 Monsters are NPCs</span>' 
                : ''}
              ${rules.allowMidJoin 
                ? '<span class="badge badge-active" style="background:#0284c7; color:white; border-color:#38bdf8;">🔄 Mid-Battle Joining</span>' 
                : ''}
              ${rules.allowedTypes.length === 3 
                ? '<span class="badge badge-active">✨ All Items Active</span>' 
                : (rules.allowedTypes.length === 0 
                  ? '<span class="badge badge-threat-loot">🚫 No Magic Items</span>' 
                  : `<span class="badge badge-type">✨ ${rules.allowedTypes.join(', ')}</span>`)}
              ${q.repeatable ? '<span class="badge badge-quest">🔁 Repeatable</span>' : ''}
            </div>
          </div>
          <div>
            ${isLive 
              ? '<span class="badge badge-active" style="background:#dc2626; color:white; border-color:#ef4444; font-size:12px; padding:4px 8px; font-weight:800; animation: pulse 2s infinite;">⚔️ LIVE BATTLE</span>'
              : (isJoinedHero || isJoinedMonster 
                ? '<span class="badge badge-active" style="font-size:12px; padding:4px 8px; background:var(--primary); color:white;">⏳ IN QUEUE</span>' 
                : '<span class="badge badge-draft" style="font-size:12px; padding:4px 8px;">⏳ OPEN LINE</span>')}
          </div>
        </div>

        ${q.description ? `<p style="font-size:13px; color:#cbd5e1; margin:6px 0 10px 0; line-height:1.45;">${q.description}</p>` : ''}

        <!-- Side-by-Side Dual Queue Roster Grid (Mobile 50/50) -->
        <div class="dual-queue-grid">
          <!-- HEROES COLUMN (Left) -->
          <div class="queue-box hero-box ${isJoinedHero ? 'joined-active' : ''}">
            <div>
              <div class="queue-header-row">
                <h5 class="queue-header-title" style="color:#38bdf8;">⚔️ Heroes</h5>
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
                    ⚔️ IN COMBAT (HERO)
                  </button>
                ` : (rules.allowMidJoin ? (isSlotLocked ? `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    ${isJoinedMonster ? '👹 IN MONSTERS' : 'SLOT FULL'}
                  </button>
                ` : `
                  <button class="btn-battle-action btn-battle-hero" onclick="joinOrCreateGroupQueue('${q.id}')">
                    ⚔️ JOIN HEROES (LIVE)
                  </button>
                `) : `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    🔒 BATTLE LIVE
                  </button>
                `)
              ) : (
                isJoinedHero ? `
                  <button class="btn-battle-action btn-battle-leave" onclick="leaveQueue('${joinedHeroQueueId}')">
                    🚪 LEAVE HEROES
                  </button>
                ` : (isSlotLocked ? `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    ${isJoinedMonster ? '👹 IN MONSTERS' : 'SLOT FULL'}
                  </button>
                ` : `
                  <button class="btn-battle-action btn-battle-hero" onclick="joinOrCreateGroupQueue('${q.id}')">
                    ⚔️ JOIN HEROES
                  </button>
                `)
              )}
            </div>
          </div>

          <!-- MONSTERS COLUMN (Right) -->
          <div class="queue-box monster-box ${isJoinedMonster ? 'joined-active' : ''}">
            <div>
              <div class="queue-header-row">
                <h5 class="queue-header-title" style="color:#f43f5e;">👹 Monsters</h5>
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
                      return `<span class="party-member-tag ${isMe ? 'is-current-user' : ''}" style="border-color:rgba(244,63,94,0.3);">👹 ${name}${absBadge}</span>`;
                    }).join('')
                  : '<p style="font-size:11px; color:#64748b; margin:6px 0; font-style:italic; text-align:center;">Line is empty.</p>'}
              </div>
            </div>

            <!-- Big Fat-Finger Monster Button -->
            <div>
              ${isLive ? (
                isJoinedMonster ? `
                  <button class="btn-battle-action btn-battle-monster" disabled style="opacity:0.95; cursor:default;">
                    👹 IN COMBAT (MONSTER)
                  </button>
                ` : (rules.allowMidJoin ? (isSlotLocked ? `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    ${isJoinedHero ? '⚔️ IN HEROES' : 'SLOT FULL'}
                  </button>
                ` : `
                  <button class="btn-battle-action btn-battle-monster" onclick="claimMonsterRole('${q.id}', 'Standard Monster')">
                    👹 JOIN MONSTERS (LIVE)
                  </button>
                `) : `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    🔒 BATTLE LIVE
                  </button>
                `)
              ) : (
                isJoinedMonster ? `
                  <button class="btn-battle-action btn-battle-leave" onclick="abandonMonsterRole('${joinedMonsterClaimId}')">
                    🚪 LEAVE MONSTERS
                  </button>
                ` : (isSlotLocked ? `
                  <button class="btn-battle-action btn-battle-disabled" disabled>
                    ${isJoinedHero ? '⚔️ IN HEROES' : 'SLOT FULL'}
                  </button>
                ` : `
                  <button class="btn-battle-action btn-battle-monster" onclick="claimMonsterRole('${q.id}', 'Standard Monster')">
                    👹 JOIN MONSTERS
                  </button>
                `)
              )}
            </div>
          </div>
        </div>

        <!-- SECRET SCENARIO BRIEFING (Anti-Cheat: Revealed only during ACTIVE BATTLE to Monsters/QM) -->
        ${scenarioClean ? (
          isLive ? (
            (isJoinedMonster || isQMUser) ? `
              <div class="secret-briefing-card">
                <div class="secret-briefing-header">
                  <span>📜</span>
                  <h5>Secret Monster Briefing (Active)</h5>
                </div>
                <p class="secret-briefing-content">${scenarioClean}</p>
              </div>
            ` : `
              <div class="secret-briefing-locked">
                <span>🔒</span> <em>Secret monster scenario briefing is locked to the Monster Line.</em>
              </div>
            `
          ) : (
            isQMUser ? `
              <div class="secret-briefing-card" style="border-style:dashed; opacity:0.85;">
                <div class="secret-briefing-header">
                  <span>🔒</span>
                  <h5>QM Preview: Secret Scenario Briefing (Encrypted for Players until Live)</h5>
                </div>
                <p class="secret-briefing-content">${scenarioClean}</p>
              </div>
            ` : `
              <div class="secret-briefing-locked">
                <span>🔒</span> <em>Secret Monster Briefing is Encrypted — Unlocks automatically when Battle goes LIVE!</em>
              </div>
            `
          )
        ) : ''}
      </div>
    `;
  }

  if (isAdventure) {
    const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(q) : { maxActive: 0, maxCompletions: 0, verificationMethod: 'Quest Master' };
    const groupType = q.participation_type || 'Solo';
    const activeCount = questUsage?.active || 0;
    const completedCount = questUsage?.completed || 0;
    const maxActive = rules.maxActive || 0;
    const maxCompletions = rules.maxCompletions || 0;
    const isFull = maxActive > 0 && activeCount >= maxActive;
    const isExhausted = maxCompletions > 0 && completedCount >= maxCompletions;

    let acceptButton = '';
    if (isExhausted) {
      acceptButton = `<button class="btn-secondary" disabled style="opacity:0.6;">Bounty Claimed</button>`;
    } else if (isFull) {
      acceptButton = `<button class="btn-secondary" disabled style="opacity:0.6;">Quest Full (${activeCount}/${maxActive})</button>`;
    } else if (isSlotLocked) {
      acceptButton = `<button class="btn-secondary" disabled style="opacity:0.6;">Quest Slot Full</button>`;
    } else {
      acceptButton = `<button class="btn-join" style="background:var(--quest); color:white;" onclick="acceptQuest('${q.id}')">Accept</button>`;
    }

    const summaryAction = `<span class="quest-summary-actions">${acceptButton}</span>`;

    return `
      <details class="quest-accordion">
        <summary>
          <span class="quest-summary-title">${q.title}</span>
          ${summaryAction}
        </summary>
        <div class="quest-accordion-content">
          <div class="quest-details-body">
            <div class="quest-details-panel">
              <div class="tag-container">
                <span class="badge badge-quest">Quest</span>
                <span class="badge badge-type">${groupType}</span>
                ${maxActive > 0 ? `<span class="badge badge-type" style="color:#38bdf8; border-color:rgba(56,189,248,0.4);">👥 ${activeCount}/${maxActive} Active</span>` : ''}
                ${maxCompletions > 0 ? `<span class="badge badge-type" style="color:var(--gold); border-color:var(--gold);">🏆 ${completedCount}/${maxCompletions} Completed</span>` : ''}
                ${rules.verificationMethod === 'Quest Master' ? '<span class="badge badge-type" style="color:#c084fc; border-color:rgba(192,132,252,0.4);">👑 QM Verified</span>' : ''}
              </div>
              <p>${q.description || ''}</p>
              <div class="quest-rewards">
                <span class="reward-gold">🪙 +${q.reward_gold} Gold</span>
              </div>
            </div>
          </div>
        </div>
      </details>
    `;
  }

  return `
    <div class="quest-card">
      <div class="tag-container">
        <span class="badge ${isCombat ? 'badge-battle' : 'badge-quest'}">${isCombat ? 'Battle' : 'Quest'}</span>
        <span class="badge badge-type">${q.participation_type || 'Solo'}</span>
      </div>
      <h4>${q.title}</h4>
      ${q.requirements ? `<p style="color:var(--warning); font-size:12px; margin-bottom:4px;"><strong>Req:</strong> ${q.requirements}</p>` : ''}
      <p>${q.description || ''}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
        <div class="quest-rewards">
          <span class="reward-gold">🪙 +${q.reward_gold} Gold</span>
        </div>
        ${isSlotLocked
          ? `<button class="btn-secondary" disabled style="opacity:0.6;">${isCombat ? 'Battle Slot Full' : 'Quest Slot Full'}</button>`
          : (isCombat
            ? `<button class="btn-accept" style="background:var(--warning);" onclick="joinOrCreateGroupQueue('${q.id}')">Join PC Line</button>`
            : `<button class="btn-accept" style="background:var(--quest);" onclick="acceptQuest('${q.id}')">Accept Quest</button>`)
        }
      </div>
    </div>
  `;
}

// QM Catalog Engine (Non-Battle Quests only)
async function fetchQMQuests() {
  const container = document.getElementById('qm-quest-list');
  if (!container) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId || currentUser?.id;
  const activeQMName = typeof getActiveQMUsername === 'function' ? getActiveQMUsername() : 'Default Realm';

  const { data: quests } = await supabaseClient
    .from('quests')
    .select('*')
    .order('created_at', { ascending: false });

  // Only non-battle (Quest) quests belonging to the active park & QM are shown in the Quest Catalog tab
  const nonBattleQuests = (quests || []).filter(q => 
    q.category !== 'Battle' && 
    q.category !== 'Combat' && 
    (!q.park || q.park === activePark) &&
    (!q.qm_id || !activeQMId || q.qm_id === activeQMId)
  );

  if (nonBattleQuests.length === 0) {
    container.innerHTML = `<p class="empty-state">No non-battle quests in the catalog for ${activePark} (${activeQMName}).</p>`;
    return;
  }

  const nonBattleQuestIds = nonBattleQuests.map(q => q.id);
  const { data: userAssignments } = await supabaseClient
    .from('user_quests')
    .select(`
      id,
      quest_id,
      user_id,
      status,
      created_at,
      profiles(id, username, quest_abilities)
    `)
    .in('quest_id', nonBattleQuestIds)
    .in('status', ['accepted', 'completed']);

  const activeByQuest = new Map();
  const completedByQuest = new Map();

  (userAssignments || []).forEach(ua => {
    if (ua.status === 'accepted') {
      if (!activeByQuest.has(ua.quest_id)) activeByQuest.set(ua.quest_id, []);
      activeByQuest.get(ua.quest_id).push(ua);
    } else if (ua.status === 'completed') {
      if (!completedByQuest.has(ua.quest_id)) completedByQuest.set(ua.quest_id, []);
      completedByQuest.get(ua.quest_id).push(ua);
    }
  });

  container.innerHTML = nonBattleQuests.map(q => {
    const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(q) : { maxActive: 0, maxCompletions: 0, verificationMethod: 'Quest Master' };
    const maxActive = rules.maxActive || 0;
    const maxCompletions = rules.maxCompletions || 0;
    const verificationMethod = rules.verificationMethod || 'Quest Master';

    const activeList = activeByQuest.get(q.id) || [];
    const completedList = completedByQuest.get(q.id) || [];
    const activeCount = activeList.length;
    const completedCount = completedList.length;
    const isExhausted = maxCompletions > 0 && completedCount >= maxCompletions;

    return `
      <div class="quest-card" style="border-left: 4px solid ${q.is_active ? 'var(--success)' : '#52525b'}; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <h4 style="margin:0 0 4px 0;">${q.title}</h4>
            <div class="tag-container" style="margin-top:4px;">
              <span class="badge badge-quest">Quest</span>
              <span class="badge badge-type">🪙 ${q.reward_gold} Gold</span>
              <span class="badge badge-type" style="color:#38bdf8; border-color:rgba(56,189,248,0.4);">
                👥 ${maxActive > 0 ? `${activeCount}/${maxActive} Active` : `${activeCount} Active (Unlimited)`}
              </span>
              <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold);">
                🏆 ${maxCompletions > 0 ? `${completedCount}/${maxCompletions} Completed` : `${completedCount} Completed`}
              </span>
              <span class="badge badge-type" style="color:#c084fc; border-color:rgba(192,132,252,0.4);">
                ${verificationMethod === 'Quest Master' ? '👑 QM Verified' : '🤝 Self-Report'}
              </span>
              ${q.repeatable ? '<span class="badge badge-quest">🔁 Repeatable</span>' : ''}
              ${isExhausted ? '<span class="badge badge-monster" style="background:#7f1d1d; color:white; border:1px solid #ef4444;">🏆 Max Completions Reached</span>' : ''}
            </div>
          </div>
          <span class="badge ${q.is_active ? 'badge-active' : 'badge-draft'}" style="white-space:nowrap;">
            ${q.is_active ? '🟢 Open on Field' : '🔴 Catalog Draft'}
          </span>
        </div>

        <p style="margin-top:6px; color:#cbd5e1; font-size:13px;">${q.description || 'No public description.'}</p>

        <!-- Active Questers on Field (QM Verification System) -->
        <div class="qm-questers-box">
          <div class="qm-questers-header">
            <span style="font-weight:700; font-size:12px; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">
              🎯 Active Questers on Field (${activeCount}${maxActive > 0 ? ` / ${maxActive}` : ''})
            </span>
            <span style="font-size:11px; color:#94a3b8;">
              ${verificationMethod === 'Quest Master' ? '👑 QM Verification' : '🤝 Honor System'}
            </span>
          </div>
          <div class="qm-questers-list">
            ${activeList.length > 0 ? activeList.map(aq => {
              const uName = aq.profiles?.username || 'Adventurer';
              const abs = Array.isArray(aq.profiles?.quest_abilities) ? aq.profiles.quest_abilities : [];
              const absBadges = abs.map(a => `<span class="ability-pill">${a}</span>`).join('');
              return `
                <div class="qm-quester-item">
                  <div class="qm-quester-info">
                    <span class="qm-quester-name">👤 ${uName}</span>
                    ${absBadges}
                  </div>
                  <div class="qm-quester-actions">
                    <button class="btn-qm-verify" onclick="qmVerifyCompleteQuest('${aq.id}', '${aq.user_id}', '${q.id}', ${q.reward_gold}, '${(q.title || '').replace(/'/g, "\\'")}', ${maxCompletions})">
                      ✅ Complete
                    </button>
                    <button class="btn-qm-kick" onclick="qmKickUserFromQuest('${aq.id}', '${(uName).replace(/'/g, "\\'")}', '${(q.title || '').replace(/'/g, "\\'")}')">
                      🚫 Kick
                    </button>
                  </div>
                </div>
              `;
            }).join('') : '<p class="empty-roster-msg">No players currently on this quest.</p>'}
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; gap:8px;">
          <button class="${q.is_active ? 'btn-toggle-draft' : 'btn-toggle-active'}" 
            onclick="toggleQuestDeployment('${q.id}', ${q.is_active})">
            ${q.is_active ? '🔴 Close Field Openings' : '🚀 Open Quest on Field'}
          </button>
          <button class="btn-delete" onclick="qmDeleteQuest('${q.id}', '${(q.title || '').replace(/'/g, "\\'")}')" title="Delete quest from catalog">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function qmVerifyCompleteQuest(userQuestId, userId, questId, rewardGold, questTitle, maxCompletions = 0) {
  const confirmed = confirm(`Verify completion for this player on "${questTitle}"?\n\nThis will award +${rewardGold} Gold to their character and complete the quest.`);
  if (!confirmed) return;

  try {
    // 1. Mark user_quest as completed
    const { error: updateErr } = await supabaseClient
      .from('user_quests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', userQuestId);

    if (updateErr) {
      alert("Error completing quest: " + updateErr.message);
      return;
    }

    // 2. Award gold to user in active park/QM
    if (typeof awardGoldToUser === 'function') {
      await awardGoldToUser(userId, rewardGold);
    }

    // 3. Trigger RNG Loot Drops if quest has them enabled
    const { data: qData } = await supabaseClient.from('quests').select('*').eq('id', questId).maybeSingle();
    const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(qData) : { rngLootDrops: false };
    if (rules.rngLootDrops && typeof rollItemLootDrops === 'function') {
      await rollItemLootDrops([userId], false);
    }

    // 4. Check if max completions reached
    if (maxCompletions > 0) {
      const { data: compRows } = await supabaseClient
        .from('user_quests')
        .select('id')
        .eq('quest_id', questId)
        .eq('status', 'completed');

      const totalCompleted = compRows?.length || 0;
      if (totalCompleted >= maxCompletions) {
        // Auto close field openings
        await supabaseClient.from('quests').update({ is_active: false }).eq('id', questId);
        alert(`🏆 Quest "${questTitle}" finished! Max completions (${maxCompletions}/${maxCompletions}) reached. Quest is now closed on the field.`);
      } else {
        alert(`✨ Quest verified! +${rewardGold}g awarded to player (${totalCompleted}/${maxCompletions} completed).`);
      }
    } else {
      alert(`✨ Quest verified! +${rewardGold}g awarded to player.`);
    }

    await fetchQMQuests();
    await fetchUserSlotState();
    await fetchQuests();
  } catch (err) {
    console.error("Error verifying quest completion:", err);
    alert("Error: " + (err.message || err));
  }
}

async function qmKickUserFromQuest(userQuestId, username, questTitle) {
  const confirmed = confirm(`Remove "${username}" from "${questTitle}"?\n\nThis will remove them from the active quest list and free up their quest slot.`);
  if (!confirmed) return;

  try {
    await supabaseClient
      .from('user_quests')
      .update({ status: 'abandoned' })
      .eq('id', userQuestId);

    alert(`🚫 ${username} removed from "${questTitle}".`);
    await fetchQMQuests();
    await fetchUserSlotState();
    await fetchQuests();
  } catch (err) {
    console.error("Error kicking user from quest:", err);
    alert("Error removing player: " + (err.message || err));
  }
}

window.qmVerifyCompleteQuest = qmVerifyCompleteQuest;
window.qmKickUserFromQuest = qmKickUserFromQuest;

async function qmDeleteQuest(questId, questTitle) {
  let title = questTitle;
  if (!title) {
    const { data } = await supabaseClient.from('quests').select('title').eq('id', questId).maybeSingle();
    title = data?.title || 'Quest';
  }

  const confirmed = confirm(`Are you sure you want to delete "${title}"?\n\nThis will permanently remove it from the catalog.`);
  if (!confirmed) return;

  try {
    // 1. Delete associated quest queues and members/monsters
    const { data: queues } = await supabaseClient
      .from('quest_queues')
      .select('id')
      .eq('quest_id', questId);

    if (queues && queues.length > 0) {
      const queueIds = queues.map(q => q.id);
      await supabaseClient.from('queue_members').delete().in('queue_id', queueIds);
      await supabaseClient.from('encounter_monsters').delete().in('queue_id', queueIds);
      await supabaseClient.from('quest_queues').delete().in('id', queueIds);
    }

    // 2. Delete user quest assignments/records
    await supabaseClient.from('user_quests').delete().eq('quest_id', questId);

    // 3. Delete the quest itself with .select() to verify rows affected
    const { data: deletedRows, error } = await supabaseClient.from('quests').delete().eq('id', questId).select();
    
    if (error) {
      alert("Failed to delete quest: " + error.message);
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      alert("⚠️ Database blocked deleting this quest.\n\nThis happens when Supabase Row-Level Security (RLS) is missing DELETE policies.\n\nPlease run the SQL in 'supabase_setup.sql' in your Supabase SQL Editor!");
      return;
    }

    // 4. Refresh all states
    await fetchUserSlotState();
    await fetchQuests();
    await fetchMonsterEncounters();
    await fetchQMQuests();
    if (typeof fetchQMQueues === 'function') {
      await fetchQMQueues();
    }
  } catch (err) {
    console.error("Error deleting quest:", err);
    alert("Error deleting quest: " + (err.message || err));
  }
}

window.qmDeleteQuest = qmDeleteQuest;

async function toggleQuestDeployment(questId, currentActiveState) {
  const nextState = !currentActiveState;
  const { error } = await supabaseClient.from('quests').update({ is_active: nextState }).eq('id', questId);

  if (error) {
    alert("Error updating quest deployment: " + error.message);
    return;
  }

  // Archive user completions/assignments when QM toggles quest deployment state (off or on)
  await supabaseClient.from('user_quests').update({ status: 'closed' }).eq('quest_id', questId);

  await fetchUserSlotState();
  await fetchQMQuests();
  await fetchQuests();
  await fetchMonsterEncounters();
}

async function createBattle() {
  const title = (document.getElementById('qm-battle-title') || document.getElementById('qm-title'))?.value.trim();
  const category = 'Battle';
  const participation_type = 'Group';
  const threat_level = 'Safe';
  const verification_method = 'Quest Master';

  const victoryInput = document.getElementById('qm-battle-gold-victory') || document.getElementById('qm-gold-victory') || document.getElementById('qm-gold');
  const defeatInput = document.getElementById('qm-battle-gold-defeat') || document.getElementById('qm-gold-defeat');
  const reward_gold_victory = victoryInput ? (parseInt(victoryInput.value) || 0) : 0;
  const reward_gold_defeat = defeatInput ? (parseInt(defeatInput.value) || 0) : 0;

  const description = (document.getElementById('qm-battle-description') || document.getElementById('qm-description'))?.value.trim() || '';
  const scenario_card = (document.getElementById('qm-battle-scenario') || document.getElementById('qm-scenario'))?.value.trim() || '';
  const repeatable = Boolean((document.getElementById('qm-battle-repeatable') || document.getElementById('qm-repeatable'))?.checked);
  
  const npcInput = document.getElementById('qm-battle-monsters-are-npc') || document.getElementById('qm-battle-monsters-npc') || document.getElementById('qm-monsters-are-npc');
  const legacyDurabilityInput = document.getElementById('qm-battle-monster-durability');
  const monsters_are_npc = npcInput ? Boolean(npcInput.checked) : (legacyDurabilityInput ? !legacyDurabilityInput.checked : false);

  const durabilityWearInput = document.getElementById('qm-battle-durability-wear');
  const durability_wear = durabilityWearInput ? Number(durabilityWearInput.value) : 1;

  const defeatPenaltyInput = document.getElementById('qm-battle-defeat-penalty');
  const defeat_penalty = defeatPenaltyInput ? defeatPenaltyInput.value : 'none';

  const allow_mid_join = Boolean((document.getElementById('qm-battle-allow-mid-join'))?.checked);
  const rng_loot_drops = Boolean((document.getElementById('qm-battle-rng-loot'))?.checked);

  const allowTrinket = document.getElementById('qm-item-trinket') ? document.getElementById('qm-item-trinket').checked : true;
  const allowTalisman = document.getElementById('qm-item-talisman') ? document.getElementById('qm-item-talisman').checked : true;
  const allowArtifact = document.getElementById('qm-item-artifact') ? document.getElementById('qm-item-artifact').checked : true;

  const allowedList = [];
  if (allowTrinket) allowedList.push('Trinket');
  if (allowTalisman) allowedList.push('Talisman');
  if (allowArtifact) allowedList.push('Artifact');
  const allowed_items = allowedList.join(',');

  if (!title) { alert("Please enter a Battle Title."); return; }

  const rulesMeta = `<!-- RULES: ${JSON.stringify({ monsters_are_npc, allowed_items: allowedList, reward_gold_defeat, defeat_gold: reward_gold_defeat, durability_wear, defeat_penalty, allow_mid_join, rng_loot_drops })} -->`;
  const scenarioWithMeta = scenario_card ? `${scenario_card}\n${rulesMeta}` : rulesMeta;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard";
  const activeQMId = currentQMId || currentUser?.id || null;
  const activeQMUsername = currentQMUsername || currentProfile?.username || 'Questmaster';

  const battlePayload = {
    title,
    category,
    reward_gold: reward_gold_victory,
    reward_gold_defeat: reward_gold_defeat,
    monsters_are_npc,
    allowed_items,
    description,
    scenario_card: scenarioWithMeta,
    repeatable,
    allow_mid_join,
    rng_loot_drops,
    park: activePark,
    kingdom: activeKingdom,
    qm_id: activeQMId,
    qm_username: activeQMUsername,
    is_active: true
  };

  let { error } = await supabaseClient.from('quests').insert(battlePayload);

  if (error) {
    let fallbackPayload = { ...battlePayload };
    const colMatch = error.message.match(/'([^']+)' column/) || error.message.match(/column ["']?([^"'\s]+)["']? of relation/);
    if (colMatch && colMatch[1] && colMatch[1] in fallbackPayload) {
      delete fallbackPayload[colMatch[1]];
    }
    delete fallbackPayload.allow_mid_join;
    delete fallbackPayload.rng_loot_drops;
    if (error.message.includes('qm_id') || error.message.includes('qm_username')) {
      delete fallbackPayload.qm_id;
      delete fallbackPayload.qm_username;
    }
    if (error.message.includes('park')) delete fallbackPayload.park;
    if (error.message.includes('kingdom')) delete fallbackPayload.kingdom;
    if (error.message.includes('monsters_are_npc')) delete fallbackPayload.monsters_are_npc;
    if (error.message.includes('allowed_items')) delete fallbackPayload.allowed_items;
    if (error.message.includes('reward_gold_defeat')) delete fallbackPayload.reward_gold_defeat;
    let retry = await supabaseClient.from('quests').insert(fallbackPayload);
    if (retry.error) {
      delete fallbackPayload.allow_mid_join;
      delete fallbackPayload.rng_loot_drops;
      delete fallbackPayload.qm_id;
      delete fallbackPayload.qm_username;
      delete fallbackPayload.park;
      delete fallbackPayload.kingdom;
      delete fallbackPayload.monsters_are_npc;
      delete fallbackPayload.allowed_items;
      delete fallbackPayload.reward_gold_defeat;
      retry = await supabaseClient.from('quests').insert(fallbackPayload);
    }
    error = retry.error;
  }

  if (error) { alert("Failed to save battle: " + error.message); return; }

  alert(`⚔️ Battle "${title}" saved and opened on field!`);

  if (document.getElementById('qm-battle-title')) document.getElementById('qm-battle-title').value = '';
  if (document.getElementById('qm-title')) document.getElementById('qm-title').value = '';
  if (document.getElementById('qm-battle-description')) document.getElementById('qm-battle-description').value = '';
  if (document.getElementById('qm-description')) document.getElementById('qm-description').value = '';
  if (document.getElementById('qm-battle-scenario')) document.getElementById('qm-battle-scenario').value = '';
  if (document.getElementById('qm-scenario')) document.getElementById('qm-scenario').value = '';
  if (victoryInput) victoryInput.value = '15';
  if (defeatInput) defeatInput.value = '10';
  if (document.getElementById('qm-battle-monsters-are-npc')) document.getElementById('qm-battle-monsters-are-npc').checked = false;
  if (document.getElementById('qm-battle-monsters-npc')) document.getElementById('qm-battle-monsters-npc').checked = false;
  if (document.getElementById('qm-monsters-are-npc')) document.getElementById('qm-monsters-are-npc').checked = false;
  if (document.getElementById('qm-battle-monster-durability')) document.getElementById('qm-battle-monster-durability').checked = true;
  if (document.getElementById('qm-battle-repeatable')) document.getElementById('qm-battle-repeatable').checked = false;
  if (document.getElementById('qm-repeatable')) document.getElementById('qm-repeatable').checked = false;
  if (document.getElementById('qm-battle-allow-mid-join')) document.getElementById('qm-battle-allow-mid-join').checked = false;
  if (document.getElementById('qm-battle-rng-loot')) document.getElementById('qm-battle-rng-loot').checked = false;
  if (document.getElementById('qm-battle-durability-wear')) document.getElementById('qm-battle-durability-wear').value = '1';
  if (document.getElementById('qm-battle-defeat-penalty')) document.getElementById('qm-battle-defeat-penalty').value = 'none';
  if (document.getElementById('qm-item-trinket')) document.getElementById('qm-item-trinket').checked = true;
  if (document.getElementById('qm-item-talisman')) document.getElementById('qm-item-talisman').checked = true;
  if (document.getElementById('qm-item-artifact')) document.getElementById('qm-item-artifact').checked = true;

  await fetchUserSlotState();
  await fetchQuests();
  await fetchMonsterEncounters();
  switchQMSubTab('queues');
}

async function createAdventureQuest() {
  const title = (document.getElementById('qm-quest-title') || document.getElementById('qm-title'))?.value.trim();
  const category = 'Quest';
  const goldInput = document.getElementById('qm-quest-gold') || document.getElementById('qm-gold-victory') || document.getElementById('qm-gold');
  const reward_gold = goldInput ? (parseInt(goldInput.value) || 0) : 0;
  const description = (document.getElementById('qm-quest-description') || document.getElementById('qm-description'))?.value.trim() || '';
  const repeatable = Boolean((document.getElementById('qm-quest-repeatable') || document.getElementById('qm-repeatable'))?.checked);

  const max_active = parseInt(document.getElementById('qm-quest-max-active')?.value) || 0;
  const max_completions = parseInt(document.getElementById('qm-quest-max-completions')?.value) || 0;
  const verification_method = document.getElementById('qm-quest-verification')?.value || 'Quest Master';
  const rng_loot_drops = Boolean((document.getElementById('qm-quest-rng-loot'))?.checked);

  if (!title) { alert("Please enter a Quest Title."); return; }

  const rulesMeta = `<!-- RULES: ${JSON.stringify({ max_active, max_completions, verification_method, rng_loot_drops })} -->`;
  const scenarioWithMeta = rulesMeta;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard";
  const activeQMId = currentQMId || currentUser?.id || null;
  const activeQMUsername = currentQMUsername || currentProfile?.username || 'Questmaster';

  const questPayload = {
    title,
    category,
    reward_gold,
    description,
    scenario_card: scenarioWithMeta,
    repeatable,
    park: activePark,
    kingdom: activeKingdom,
    qm_id: activeQMId,
    qm_username: activeQMUsername,
    max_active,
    max_completions,
    verification_method,
    rng_loot_drops,
    is_active: true
  };

  let { error } = await supabaseClient.from('quests').insert(questPayload);

  // Resilient retry loop if any optional column is missing in Supabase schema cache
  if (error) {
    let fallbackPayload = { ...questPayload };
    const colMatch = error.message.match(/'([^']+)' column/) || error.message.match(/column ["']?([^"'\s]+)["']? of relation/);
    if (colMatch && colMatch[1] && colMatch[1] in fallbackPayload) {
      delete fallbackPayload[colMatch[1]];
    }
    delete fallbackPayload.max_active;
    delete fallbackPayload.max_completions;
    delete fallbackPayload.verification_method;
    delete fallbackPayload.rng_loot_drops;
    delete fallbackPayload.qm_id;
    delete fallbackPayload.qm_username;
    delete fallbackPayload.park;
    delete fallbackPayload.kingdom;
    let retry = await supabaseClient.from('quests').insert(fallbackPayload);
    error = retry.error;
  }

  if (error) { alert("Failed to save quest: " + error.message); return; }

  alert(`📜 Quest "${title}" published to catalog!`);

  if (document.getElementById('qm-quest-title')) document.getElementById('qm-quest-title').value = '';
  if (document.getElementById('qm-title')) document.getElementById('qm-title').value = '';
  if (document.getElementById('qm-quest-description')) document.getElementById('qm-quest-description').value = '';
  if (document.getElementById('qm-description')) document.getElementById('qm-description').value = '';
  if (goldInput) goldInput.value = '15';
  if (document.getElementById('qm-quest-repeatable')) document.getElementById('qm-quest-repeatable').checked = false;
  if (document.getElementById('qm-repeatable')) document.getElementById('qm-repeatable').checked = false;
  if (document.getElementById('qm-quest-max-active')) document.getElementById('qm-quest-max-active').value = '0';
  if (document.getElementById('qm-quest-max-completions')) document.getElementById('qm-quest-max-completions').value = '0';
  if (document.getElementById('qm-quest-verification')) document.getElementById('qm-quest-verification').value = 'Quest Master';
  if (document.getElementById('qm-quest-rng-loot')) document.getElementById('qm-quest-rng-loot').checked = false;

  await fetchUserSlotState();
  await fetchQuests();
  switchQMSubTab('library');
}

async function createQuest() {
  const category = document.getElementById('qm-category')?.value || 'Battle';
  if (category === 'Battle') {
    await createBattle();
  } else {
    await createAdventureQuest();
  }
}

async function acceptQuest(questId) {
  if (!currentUser) return;

  // Capacity & Completion limits check
  const { data: q } = await supabaseClient.from('quests').select('*').eq('id', questId).maybeSingle();
  if (q) {
    const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(q) : { maxActive: 0, maxCompletions: 0 };
    if (rules.maxActive > 0) {
      const { data: activeRows } = await supabaseClient
        .from('user_quests')
        .select('id')
        .eq('quest_id', questId)
        .eq('status', 'accepted');
      if (activeRows && activeRows.length >= rules.maxActive) {
        alert(`⚠️ This quest is currently at full capacity (${activeRows.length}/${rules.maxActive} active players).\n\nPlease wait for an active adventurer to finish or abandon!`);
        return;
      }
    }
    if (rules.maxCompletions > 0) {
      const { data: compRows } = await supabaseClient
        .from('user_quests')
        .select('id')
        .eq('quest_id', questId)
        .eq('status', 'completed');
      if (compRows && compRows.length >= rules.maxCompletions) {
        alert(`🏆 This quest has reached its maximum completions (${rules.maxCompletions}/${rules.maxCompletions})!`);
        return;
      }
    }
  }

  // Check if a user_quests row already exists for this user and quest to avoid unique constraint conflicts
  const { data: existingRows } = await supabaseClient
    .from('user_quests')
    .select('id')
    .eq('user_id', currentUser.id)
    .eq('quest_id', questId);

  let error = null;

  if (existingRows && existingRows.length > 0) {
    const res = await supabaseClient
      .from('user_quests')
      .update({ status: 'accepted' })
      .eq('id', existingRows[0].id);
    error = res.error;
  } else {
    const res = await supabaseClient
      .from('user_quests')
      .insert({ user_id: currentUser.id, quest_id: questId, status: 'accepted' });
    error = res.error;
  }

  if (error) { alert("Error accepting quest: " + error.message); return; }
  await fetchUserSlotState();
  await fetchQuests();
}

async function completeQuest(userQuestId, rewardGold) {
  const { data: uq } = await supabaseClient
    .from('user_quests')
    .select('quest_id, quests(*)')
    .eq('id', userQuestId)
    .single();
  const isCombat = uq?.quests?.category === 'Battle' || uq?.quests?.category === 'Combat';
  const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(uq?.quests) : { allowedTypes: null, rngLootDrops: false };

  await updateParkGold(rewardGold, true);

  await supabaseClient.from('user_quests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', userQuestId);

  if (isCombat) {
    await applyCombatDurabilityDamage(currentUser.id, rules.allowedTypes);
  }

  // Roll Mystery Item Loot Drops if enabled on quest
  if (rules.rngLootDrops && typeof rollItemLootDrops === 'function') {
    await rollItemLootDrops([currentUser.id], isCombat);
  }

  initDashboard();
}
