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
      .select('id, quest_id, status, queue_members(*, profiles(id, username)), encounter_monsters(*, profiles(id, username))')
      .in('quest_id', combatQuestIds)
      .in('status', ['waiting', 'active']);

    (queuedBattleLines || []).forEach(line => {
      if (!line || !line.quest_id) return;
      const heroRoster = (line.queue_members || []).map(member => member.profiles?.username || 'Hero').filter(Boolean);
      const monsterRoster = (line.encounter_monsters || []).map(member => member.profiles?.username || 'Monster').filter(Boolean);
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
    const activeAdvHtml = activeAdventureQuests.map(uq => renderActiveAdventureQuestCard(uq)).join('');
    const availAdvHtml = larpieQuests.map(q => renderAvailableQuestCard(q, 'larpie')).join('');
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
  const groupType = q.participation_type || 'Solo';
  const rewardGold = q.reward_gold || 0;
  const summaryActions = `
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
              <span class="badge badge-active">Active</span>
            </div>
            ${q.requirements ? `<p style="color:var(--warning); font-size:12px; margin-bottom:4px;"><strong>Req:</strong> ${q.requirements}</p>` : ''}
            <p>${q.description || ''}</p>
            <div class="quest-rewards">
              <span class="reward-gold">🪙 +${rewardGold} Gold</span>
            </div>
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

function renderAvailableQuestCard(q, type, joinedQueueId = null, queueRoster = null) {
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

    return `
      <div class="quest-card battle-card" style="border: 2px solid ${isLive ? '#dc2626' : (isJoinedHero || isJoinedMonster ? 'var(--primary)' : 'var(--border)')}; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
          <div>
            <h4 style="margin:0 0 4px 0; font-size:16px;">${q.title}</h4>
            <div class="tag-container" style="margin-bottom:0;">
              <span class="badge badge-battle">⚔️ Battle</span>
              <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold);">🏆 +${victoryGold}g Win</span>
              <span class="badge badge-type" style="color:#94a3b8; border-color:#64748b;">💀 +${defeatGold}g Loss</span>
              ${rules.monstersAreNpc 
                ? '<span class="badge badge-monster" title="Monster queue does not lose durability">👹 Monster: NPC</span>' 
                : '<span class="badge badge-type" title="Monster queue loses durability">👹 Monster: Player</span>'}
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
              ? '<span class="badge badge-active" style="background:#dc2626; color:white; border-color:#ef4444;">⚔️ LIVE</span>'
              : (isJoinedHero || isJoinedMonster 
                ? '<span class="badge badge-active">⏳ IN QUEUE</span>' 
                : '<span class="badge badge-draft">⏳ OPEN</span>')}
          </div>
        </div>

        ${q.description ? `<p style="font-size:13px; color:var(--text-muted); margin:6px 0 10px 0; line-height:1.4;">${q.description}</p>` : ''}

        <!-- Dual Queue Roster Grid (Mobile-friendly) -->
        <div class="dual-queue-grid" style="margin-top:10px; margin-bottom:10px;">
          <!-- HEROES QUEUE -->
          <div class="queue-box" style="border-color:${isJoinedHero ? 'var(--primary)' : 'var(--border)'};">
            <h5 style="color:var(--primary); margin:0 0 6px 0; font-size:11px;">⚔️ Heroes (${heroPlayers.length})</h5>
            <div style="min-height:36px; max-height:90px; overflow-y:auto; margin-bottom:8px;">
              ${heroPlayers.length > 0 
                ? heroPlayers.map(name => `<span class="party-member-tag">👤 ${name}</span>`).join('')
                : '<p style="font-size:11px; color:var(--text-muted); margin:4px 0;">No heroes yet.</p>'}
            </div>
            ${isJoinedHero ? `
              <button class="btn-leave" style="width:100%; padding:7px 4px; font-size:11px;" onclick="leaveQueue('${joinedHeroQueueId}')">
                Leave Line
              </button>
            ` : (isSlotLocked ? `
              <button class="btn-secondary" disabled style="width:100%; padding:7px 4px; font-size:11px; opacity:0.5; cursor:not-allowed;">
                ${isJoinedMonster ? 'In Monsters' : 'Slot Full'}
              </button>
            ` : `
              <button class="btn-join" style="width:100%; padding:7px 4px; font-size:11px;" onclick="joinOrCreateGroupQueue('${q.id}')">
                ⚔️ Join Heroes
              </button>
            `)}
          </div>

          <!-- MONSTER QUEUE -->
          <div class="queue-box" style="border-color:${isJoinedMonster ? 'var(--monster)' : 'var(--border)'};">
            <h5 style="color:var(--monster); margin:0 0 6px 0; font-size:11px;">👹 Monsters (${monsterPlayers.length})</h5>
            <div style="min-height:36px; max-height:90px; overflow-y:auto; margin-bottom:8px;">
              ${monsterPlayers.length > 0 
                ? monsterPlayers.map(name => `<span class="party-member-tag" style="border-color:var(--monster);">👹 ${name}</span>`).join('')
                : '<p style="font-size:11px; color:var(--text-muted); margin:4px 0;">No monsters yet.</p>'}
            </div>
            ${isJoinedMonster ? `
              <button class="btn-leave" style="width:100%; padding:7px 4px; font-size:11px;" onclick="abandonMonsterRole('${joinedMonsterClaimId}')">
                Leave Line
              </button>
            ` : (isSlotLocked ? `
              <button class="btn-secondary" disabled style="width:100%; padding:7px 4px; font-size:11px; opacity:0.5; cursor:not-allowed;">
                ${isJoinedHero ? 'In Heroes' : 'Slot Full'}
              </button>
            ` : `
              <button class="btn-join btn-monster" style="width:100%; padding:7px 4px; font-size:11px; background:var(--monster); color:white;" onclick="claimMonsterRole('${q.id}', 'Standard Monster')">
                👹 Join Monsters
              </button>
            `)}
          </div>
        </div>

        <!-- SECRET SCENARIO CARD (Revealed only to players in Monster Line or QM) -->
        ${(isJoinedMonster || isQMUser) && scenarioClean ? `
          <div class="scenario-card-box" style="margin-top:10px; border:1px dashed #c084fc; background:rgba(88,28,135,0.25); border-radius:8px; padding:10px 12px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="font-size:13px;">🔒</span>
              <h5 style="color:#c084fc; font-size:11px; font-weight:bold; text-transform:uppercase; margin:0;">Secret Monster Scenario Briefing</h5>
            </div>
            <p style="font-size:12px; color:#f3e8ff; margin:0; line-height:1.45;">${scenarioClean}</p>
          </div>
        ` : (!isJoinedMonster && !isQMUser && scenarioClean ? `
          <div style="font-size:11px; color:var(--text-muted); margin-top:8px; display:flex; align-items:center; gap:5px;">
            <span>🔒</span> <em>Secret monster scenario briefing is locked to the Monster Line.</em>
          </div>
        ` : '')}
      </div>
    `;
  }

  if (isAdventure) {
    const groupType = q.participation_type || 'Solo';
    const acceptButton = isSlotLocked
      ? `<button class="btn-secondary" disabled style="opacity:0.6;">Quest Slot Full</button>`
      : `<button class="btn-join" style="background:var(--quest); color:white;" onclick="acceptQuest('${q.id}')">Accept</button>`;

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

  container.innerHTML = nonBattleQuests.map(q => `
    <div class="quest-card" style="border-left: 4px solid ${q.is_active ? 'var(--success)' : '#52525b'};">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <h4>${q.title}</h4>
        <span class="badge ${q.is_active ? 'badge-active' : 'badge-draft'}">
          ${q.is_active ? '🟢 Open on Field' : '🔴 Catalog Draft'}
        </span>
      </div>

      <div class="tag-container" style="margin-top:6px;">
        <span class="badge badge-quest">Quest</span>
        <span class="badge badge-type">🪙 ${q.reward_gold} Gold</span>
      </div>

      <p style="margin-top:6px;">${q.description || 'No public description.'}</p>

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
  `).join('');
}

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
      alert("⚠️ Database blocked deleting this quest.\n\nThis happens when Supabase Row-Level Security (RLS) is missing DELETE policies.\n\nPlease run the SQL in 'supabase_quest_management_setup.sql' in your Supabase SQL Editor!");
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
  const monsters_are_npc = Boolean((document.getElementById('qm-battle-monsters-are-npc') || document.getElementById('qm-monsters-are-npc'))?.checked);

  const allowTrinket = document.getElementById('qm-item-trinket') ? document.getElementById('qm-item-trinket').checked : true;
  const allowTalisman = document.getElementById('qm-item-talisman') ? document.getElementById('qm-item-talisman').checked : true;
  const allowArtifact = document.getElementById('qm-item-artifact') ? document.getElementById('qm-item-artifact').checked : true;

  const allowedList = [];
  if (allowTrinket) allowedList.push('Trinket');
  if (allowTalisman) allowedList.push('Talisman');
  if (allowArtifact) allowedList.push('Artifact');
  const allowed_items = allowedList.join(',');

  if (!title) { alert("Please enter a Battle Title."); return; }

  const rulesMeta = `<!-- RULES: ${JSON.stringify({ monsters_are_npc, allowed_items: allowedList, reward_gold_defeat, defeat_gold: reward_gold_defeat })} -->`;
  const scenarioWithMeta = scenario_card ? `${scenario_card}\n${rulesMeta}` : rulesMeta;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard";
  const activeQMId = currentQMId || currentUser?.id || null;
  const activeQMUsername = currentQMUsername || currentProfile?.username || 'Questmaster';

  const battlePayload = {
    title,
    category,
    participation_type,
    threat_level,
    verification_method,
    reward_gold: reward_gold_victory,
    reward_gold_defeat: reward_gold_defeat,
    monsters_are_npc,
    allowed_items,
    requirements: '',
    description,
    scenario_card: scenarioWithMeta,
    repeatable,
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
  if (document.getElementById('qm-monsters-are-npc')) document.getElementById('qm-monsters-are-npc').checked = false;
  if (document.getElementById('qm-battle-repeatable')) document.getElementById('qm-battle-repeatable').checked = false;
  if (document.getElementById('qm-repeatable')) document.getElementById('qm-repeatable').checked = false;
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
  const participation_type = 'Solo';
  const threat_level = 'Safe';
  const verification_method = 'Honor';

  const goldInput = document.getElementById('qm-quest-gold') || document.getElementById('qm-gold-victory') || document.getElementById('qm-gold');
  const reward_gold = goldInput ? (parseInt(goldInput.value) || 0) : 0;
  const description = (document.getElementById('qm-quest-description') || document.getElementById('qm-description'))?.value.trim() || '';
  const repeatable = Boolean((document.getElementById('qm-quest-repeatable') || document.getElementById('qm-repeatable'))?.checked);

  if (!title) { alert("Please enter a Quest Title."); return; }

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard";
  const activeQMId = currentQMId || currentUser?.id || null;
  const activeQMUsername = currentQMUsername || currentProfile?.username || 'Questmaster';

  const questPayload = {
    title,
    category,
    participation_type,
    threat_level,
    verification_method,
    reward_gold,
    requirements: '',
    description,
    scenario_card: '',
    repeatable,
    park: activePark,
    kingdom: activeKingdom,
    qm_id: activeQMId,
    qm_username: activeQMUsername,
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
    // Delete any non-core columns if still erroring
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

  await updateParkGold(rewardGold, true);

  await supabaseClient.from('user_quests').update({ status: 'completed' }).eq('id', userQuestId);

  if (isCombat) {
    const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(uq?.quests) : { allowedTypes: null };
    await applyCombatDurabilityDamage(currentUser.id, rules.allowedTypes);
  }

  initDashboard();
}
