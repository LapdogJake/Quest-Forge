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

  activeMonsterClaim = (monsterClaims && monsterClaims.length > 0) ? monsterClaims[0] : null;

  // Auto-cleanup any orphan user_quests for quests that have been closed or deactivated by QM
  const orphanQuestIds = userQuests?.filter(uq => !uq.quests || uq.quests.is_active === false).map(uq => uq.id) || [];
  if (orphanQuestIds.length > 0) {
    await supabaseClient.from('user_quests').delete().in('id', orphanQuestIds);
  }

  const activeSoloBattle = userQuests?.find(uq => uq.quests?.is_active && (uq.quests?.category === 'Battle' || uq.quests?.category === 'Combat'));
  const activeGroupBattle = queueMemberships?.find(qm => {
    const queue = qm.quest_queues;
    const quest = queue?.quests;
    return (queue?.status !== 'completed') && quest?.is_active && (quest?.category === 'Battle' || quest?.category === 'Combat');
  });

  activeBattleQuest = activeSoloBattle || activeGroupBattle;
  activeLarpieQuest = userQuests?.find(uq => uq.quests?.is_active && (uq.quests?.category === 'Adventure' || (uq.quests?.category !== 'Battle' && uq.quests?.category !== 'Combat')));

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
    ? userQuests.filter(uq => uq.status === 'accepted' && uq.quests && (uq.quests.category === 'Adventure' || (uq.quests.category !== 'Battle' && uq.quests.category !== 'Combat')))
    : [];

  const { data: allQuests } = await supabaseClient
    .from('quests')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (!allQuests || allQuests.length === 0) {
    if (combatContainer) combatContainer.innerHTML = `<p class="empty-state">No Active Quests.</p>`;
    if (larpieContainer) {
      const activeAdvHtml = activeAdventureQuests.map(uq => renderActiveAdventureQuestCard(uq)).join('');
      larpieContainer.innerHTML = activeAdvHtml.length > 0 ? activeAdvHtml : `<p class="empty-state">No Active Quests.</p>`;
    }
    return;
  }

  const available = allQuests.filter(q => !activeQuestIds.includes(q.id) && (q.repeatable || !completedQuestIds.includes(q.id)));

  const combatQuests = available.filter(q => q.category === 'Battle' || q.category === 'Combat');
  const larpieQuests = available.filter(q => q.category === 'Adventure' || (q.category !== 'Battle' && q.category !== 'Combat'));

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
      .select('id, quest_id, status, queue_members(*, profiles(username))')
      .in('quest_id', combatQuestIds)
      .in('status', ['waiting', 'active']);

    (queuedBattleLines || []).forEach(line => {
      if (!line || !line.quest_id) return;
      const roster = (line.queue_members || []).map(member => member.profiles?.username || 'Hero').filter(Boolean);
      queueRosterByQuest.set(line.quest_id, {
        queueId: line.id,
        queueStatus: line.status,
        players: roster,
        count: roster.length
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
      : `<p class="empty-state">No Active Quests.</p>`;
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
  const rewardQp = q.reward_qp || 0;
  const summaryActions = `
    <span class="quest-summary-actions">
      <button class="btn-leave" onclick="abandonQuest('${uq.id}')">Abandon</button>
      <button class="btn-complete" onclick="completeQuest('${uq.id}', ${rewardGold}, ${rewardQp})">Complete</button>
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
              <span class="badge badge-adventure">${q.category || 'Adventure'}</span>
              <span class="badge badge-type">${groupType}</span>
              <span class="badge badge-active">Active</span>
            </div>
            ${q.requirements ? `<p style="color:var(--warning); font-size:12px; margin-bottom:4px;"><strong>Req:</strong> ${q.requirements}</p>` : ''}
            <p>${q.description || ''}</p>
            <div class="quest-rewards">
              <span class="reward-gold">🪙 +${rewardGold} Gold</span>
              <span class="reward-qp">⭐ +${rewardQp} QP</span>
            </div>
          </div>
        </div>
      </div>
    </details>
  `;
}

function renderSoloQuestCard(q, isActive, userQuestId) {
  if (!q) return '';
  const isAdventure = q.category === 'Adventure' || (q.category !== 'Battle' && q.category !== 'Combat');
  const rewardGold = q.reward_gold || 0;
  const rewardQp = q.reward_qp || 0;
  const groupType = q.participation_type || 'Solo';

  return `
    <div class="quest-card" style="border-left: 4px solid var(--adventure);">
      <div class="tag-container">
        <span class="badge ${isAdventure ? 'badge-adventure' : 'badge-battle'}">${q.category || 'Adventure'}</span>
        <span class="badge badge-type">${groupType}</span>
        <span class="badge badge-active">Active</span>
      </div>
      <h4>${q.title}</h4>
      ${q.requirements ? `<p style="color:var(--warning); font-size:12px; margin-bottom:4px;"><strong>Req:</strong> ${q.requirements}</p>` : ''}
      <p>${q.description || ''}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
        <div class="quest-rewards">
          <span class="reward-gold">🪙 +${rewardGold} Gold</span>
          <span class="reward-qp">⭐ +${rewardQp} QP</span>
        </div>
        <button class="btn-complete" onclick="completeQuest('${userQuestId}', ${rewardGold}, ${rewardQp})">Complete</button>
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
          <span class="reward-qp">⭐ +${q.reward_qp} QP</span>
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
  const isJoined = Boolean(joinedQueueId);

  if (isCombat) {
    const groupType = q.participation_type || 'Group';
    const joinButton = isJoined
      ? `<button class="btn-leave" onclick="leaveQueue('${joinedQueueId}')">Leave</button>`
      : (isSlotLocked
        ? `<button class="btn-secondary" disabled style="opacity:0.6;">Battle Slot Full</button>`
        : `<button class="btn-join" onclick="joinOrCreateGroupQueue('${q.id}')">Join</button>`);

    const summaryAction = `<span class="quest-summary-actions">${joinButton}</span>`;
    const rosterPlayers = queueRoster?.players || [];
    const rosterHtml = rosterPlayers.length > 0
      ? rosterPlayers.map(name => `<span class="party-member-tag">👤 ${name}</span>`).join('')
      : `<span class="party-member-tag">No one has joined this line yet.</span>`;

    return `
      <details class="quest-accordion ${isJoined ? 'quest-joined' : ''}" ${isJoined ? 'open' : ''}>
        <summary>
          <span class="quest-summary-title">${q.title}</span>
          ${summaryAction}
        </summary>
        <div class="quest-accordion-content">
          <div class="quest-details-body">
            <div class="quest-details-panel">
              <div class="tag-container">
                <span class="badge badge-battle">${q.category || 'Battle'}</span>
                <span class="badge badge-type">${groupType}</span>
              </div>
              <p>${q.description || ''}</p>
              <div class="quest-rewards">
                <span class="reward-gold">🪙 +${q.reward_gold} Gold</span>
                <span class="reward-qp">⭐ +${q.reward_qp} QP</span>
              </div>
              <div class="queue-roster-strip">
                <h5>Queued Heroes (${rosterPlayers.length})</h5>
                <div>${rosterHtml}</div>
              </div>
            </div>
          </div>
        </div>
      </details>
    `;
  }

  if (isAdventure) {
    const groupType = q.participation_type || 'Solo';
    const acceptButton = isSlotLocked
      ? `<button class="btn-secondary" disabled style="opacity:0.6;">Adventure Slot Full</button>`
      : `<button class="btn-join" style="background:var(--adventure); color:white;" onclick="acceptQuest('${q.id}')">Accept</button>`;

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
                <span class="badge badge-adventure">${q.category || 'Adventure'}</span>
                <span class="badge badge-type">${groupType}</span>
              </div>
              <p>${q.description || ''}</p>
              <div class="quest-rewards">
                <span class="reward-gold">🪙 +${q.reward_gold} Gold</span>
                <span class="reward-qp">⭐ +${q.reward_qp} QP</span>
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
        <span class="badge ${isCombat ? 'badge-battle' : 'badge-adventure'}">${q.category || 'General'}</span>
        <span class="badge badge-type">${q.participation_type || 'Solo'}</span>
      </div>
      <h4>${q.title}</h4>
      ${q.requirements ? `<p style="color:var(--warning); font-size:12px; margin-bottom:4px;"><strong>Req:</strong> ${q.requirements}</p>` : ''}
      <p>${q.description || ''}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
        <div class="quest-rewards">
          <span class="reward-gold">🪙 +${q.reward_gold} Gold</span>
          <span class="reward-qp">⭐ +${q.reward_qp} QP</span>
        </div>
        ${isSlotLocked
          ? `<button class="btn-secondary" disabled style="opacity:0.6;">${isCombat ? 'Battle Slot Full' : 'Adventure Slot Full'}</button>`
          : (isCombat
            ? `<button class="btn-accept" style="background:var(--warning);" onclick="joinOrCreateGroupQueue('${q.id}')">Join PC Line</button>`
            : `<button class="btn-accept" style="background:var(--adventure);" onclick="acceptQuest('${q.id}')">Accept Quest</button>`)
        }
      </div>
    </div>
  `;
}

// QM Catalog Engine
async function fetchQMQuests() {
  const container = document.getElementById('qm-quest-list');
  if (!container) return;

  const { data: quests } = await supabaseClient
    .from('quests')
    .select('*')
    .order('created_at', { ascending: false });

  if (!quests || quests.length === 0) {
    container.innerHTML = `<p class="empty-state">No saved quests in the catalog.</p>`;
    return;
  }

  container.innerHTML = quests.map(q => `
    <div class="quest-card" style="border-left: 4px solid ${q.is_active ? 'var(--success)' : '#52525b'};">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <h4>${q.title}</h4>
        <span class="badge ${q.is_active ? 'badge-active' : 'badge-draft'}">
          ${q.is_active ? '🟢 Open on Field' : '🔴 Catalog Draft'}
        </span>
      </div>

      <div class="tag-container" style="margin-top:6px;">
        <span class="badge badge-type">${q.participation_type}</span>
        <span class="badge ${q.category === 'Battle' || q.category === 'Combat' ? 'badge-battle' : 'badge-adventure'}">${q.category}</span>
        <span class="badge badge-type">🪙 ${q.reward_gold}g / ⭐ ${q.reward_qp}qp</span>
      </div>

      <p style="margin-top:6px;">${q.description || 'No public description.'}</p>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
        <button class="${q.is_active ? 'btn-toggle-draft' : 'btn-toggle-active'}" 
          onclick="toggleQuestDeployment('${q.id}', ${q.is_active})">
          ${q.is_active ? '🔴 Close Field Openings' : '🚀 Open Encounter on Field'}
        </button>
      </div>
    </div>
  `).join('');
}

async function toggleQuestDeployment(questId, currentActiveState) {
  const nextState = !currentActiveState;
  const { error } = await supabaseClient.from('quests').update({ is_active: nextState }).eq('id', questId);

  if (error) {
    alert("Error updating quest deployment: " + error.message);
    return;
  }

  // Archive user completions/assignments when QM toggles quest deployment state (off or on)
  // Turning ON resets completions for the new event; Turning OFF closes active assignments
  await supabaseClient.from('user_quests').update({ status: 'closed' }).eq('quest_id', questId);

  await fetchUserSlotState();
  await fetchQMQuests();
  await fetchQuests();
  await fetchMonsterEncounters();
}

async function createQuest() {
  const title = document.getElementById('qm-title').value.trim();
  const category = document.getElementById('qm-category').value;
  const participation_type = document.getElementById('qm-type').value;
  const threat_level = document.getElementById('qm-threat').value;
  const verification_method = document.getElementById('qm-verification').value;
  const reward_gold = parseInt(document.getElementById('qm-gold').value) || 0;
  const reward_qp = parseInt(document.getElementById('qm-qp').value) || 0;
  const requirements = document.getElementById('qm-requirements').value.trim();
  const description = document.getElementById('qm-description').value.trim();
  const scenario_card = document.getElementById('qm-scenario').value.trim();
  const repeatable = document.getElementById('qm-repeatable').checked;

  if (!title) { alert("Please enter a Quest Title."); return; }

  const { error } = await supabaseClient.from('quests').insert({
    title, category, participation_type, threat_level, verification_method,
    reward_gold, reward_qp, requirements, description, scenario_card, repeatable, is_active: true
  });

  if (error) { alert("Failed to save quest: " + error.message); return; }

  alert(`⚔️ Quest "${title}" saved and opened on field!`);

  document.getElementById('qm-title').value = '';
  document.getElementById('qm-description').value = '';
  document.getElementById('qm-scenario').value = '';

  await fetchUserSlotState();
  await fetchQuests();
  await fetchMonsterEncounters();
  switchQMSubTab('library');
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

async function completeQuest(userQuestId, rewardGold, rewardQp) {
  const { data: uq } = await supabaseClient
    .from('user_quests')
    .select('quest_id, quests(category)')
    .eq('id', userQuestId)
    .single();
  const isCombat = uq?.quests?.category === 'Battle' || uq?.quests?.category === 'Combat';

  const { data: profile } = await supabaseClient.from('profiles').select('gold, quest_points').eq('id', currentUser.id).single();

  await supabaseClient.from('profiles').update({
    gold: (profile?.gold || 0) + rewardGold,
    quest_points: (profile?.quest_points || 0) + rewardQp
  }).eq('id', currentUser.id);

  await supabaseClient.from('user_quests').update({ status: 'completed' }).eq('id', userQuestId);

  if (isCombat) {
    await applyCombatDurabilityDamage(currentUser.id);
  }

  initDashboard();
}
