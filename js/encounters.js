// ==============================================================================
// Quest-Forge: Monster Encounters, PC Lines, & Questmaster Queue Controls
// ==============================================================================

async function fetchMonsterEncounters() {
  // Delegate directly to fetchQuests() which manages the live unified combat board (#available-combat-quests)
  if (typeof fetchQuests === 'function') {
    return await fetchQuests();
  }
}

function renderMonsterQuestCard(q, activeMonsterClaim, monsterRoster = null, isBattleLocked = false) {
  if (typeof renderAvailableQuestCard === 'function') {
    return renderAvailableQuestCard(q, 'combat', null, monsterRoster);
  }
  return '';
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

// ==============================================================================
// Questmaster: Battle Catalog & Field Encounter State Management
// ==============================================================================

async function fetchQMQueues() {
  const container = document.getElementById('qm-queue-list');
  if (!container) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId || currentUser?.id;
  const activeQMName = typeof getActiveQMUsername === 'function' ? getActiveQMUsername() : 'Default Realm';

  // 1. Fetch all combat/battle quests for the active park and QM
  const { data: allBattleQuests, error: questError } = await supabaseClient
    .from('quests')
    .select('*')
    .or('category.eq.Battle,category.eq.Combat')
    .order('created_at', { ascending: false });

  if (questError) {
    container.innerHTML = `<p class="empty-state" style="color:var(--danger);">Error loading battles: ${questError.message}</p>`;
    return;
  }

  const normActivePark = typeof normalizeParkName === 'function' ? normalizeParkName(activePark) : (activePark || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
  const myUserId = currentUser?.id;

  const battleQuests = (allBattleQuests || []).filter(q => {
    const normQPark = typeof normalizeParkName === 'function' ? normalizeParkName(q.park) : (q.park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
    const parkMatches = !normQPark || !normActivePark || (normQPark === normActivePark);
    if (!parkMatches) return false;
    const isMyQuest = Boolean(myUserId && q.qm_id === myUserId);
    const qmMatches = !q.qm_id || !activeQMId || (q.qm_id === activeQMId) || isMyQuest;
    return qmMatches;
  });

  if (!battleQuests || battleQuests.length === 0) {
    container.innerHTML = `<p class="empty-state">No battle quests found for ${activePark} (${activeQMName}). Create one in the Forge Quest tab!</p>`;
    return;
  }

  // 2. Fetch all open/live queues for battle quests with roster profiles
  const questIds = battleQuests.map(q => q.id);
  const { data: openQueues } = await supabaseClient
    .from('quest_queues')
    .select(`
      *,
      queue_members(*, profiles(id, username, quest_abilities)),
      encounter_monsters(*, profiles(id, username, quest_abilities))
    `)
    .in('quest_id', questIds)
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false });

  // Map latest open queue by quest_id
  const queuesByQuest = new Map();
  (openQueues || []).forEach(qq => {
    if (!queuesByQuest.has(qq.quest_id)) {
      queuesByQuest.set(qq.quest_id, qq);
    }
  });

  // 3. Sort battles: Live first (0), Open second (1), Closed last (2), newest created first
  const stateRank = { 'live': 0, 'open': 1, 'closed': 2 };

  battleQuests.sort((a, b) => {
    const queueA = queuesByQuest.get(a.id);
    const queueB = queuesByQuest.get(b.id);

    let stateA = 'closed';
    if (queueA) {
      stateA = queueA.status === 'active' ? 'live' : (queueA.status === 'waiting' ? 'open' : 'closed');
    } else if (a.is_active) {
      stateA = 'open';
    }

    let stateB = 'closed';
    if (queueB) {
      stateB = queueB.status === 'active' ? 'live' : (queueB.status === 'waiting' ? 'open' : 'closed');
    } else if (b.is_active) {
      stateB = 'open';
    }

    const rankA = stateRank[stateA] ?? 99;
    const rankB = stateRank[stateB] ?? 99;
    if (rankA !== rankB) return rankA - rankB;

    // Within same state group: newest created first
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;

    return (a.title || '').localeCompare(b.title || '');
  });

  // 4. Render collapsible battle cards formatted like the Battle Line
  container.innerHTML = battleQuests.map(q => {
    const activeQueue = queuesByQuest.get(q.id);
    const rules = typeof getQuestDurabilityRules === 'function' 
      ? getQuestDurabilityRules(q) 
      : { monstersAreNpc: false, allowedTypes: ['Trinket', 'Talisman', 'Artifact'], defeatGold: 0 };
    const victoryGold = Number(q.reward_gold) || 0;
    const defeatGold = Number(q.reward_gold_defeat) || Number(rules.defeatGold) || 0;

    // Determine state: 'closed' | 'open' | 'live'
    let state = 'closed';
    if (activeQueue) {
      if (activeQueue.status === 'active') {
        state = 'live';
      } else if (activeQueue.status === 'waiting') {
        state = 'open';
      }
    } else if (q.is_active) {
      state = 'open';
    }

    let statusBadge = `<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; white-space:nowrap; padding:2px 4px; border:none;">⚪ Closed</span>`;
    if (state === 'live') {
      statusBadge = `<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; white-space:nowrap; padding:2px 4px; border:none;">🟠 Live</span>`;
    } else if (state === 'open') {
      statusBadge = `<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; white-space:nowrap; padding:2px 4px; border:none;">🟢 Open</span>`;
    }

    const heroMembers = activeQueue?.queue_members || [];
    const monsterMembers = activeQueue?.encounter_monsters || [];
    const queueId = activeQueue?.id || '';
    const isOpenByDefault = state === 'live';

    return `
      <details class="quest-accordion battle-accordion" data-quest-id="${q.id}" ${isOpenByDefault ? 'open' : ''} style="border: 1px solid var(--border); margin-bottom: 12px;">
        <summary>
          <span class="quest-summary-title" style="font-size:15px; font-weight:800;">⚔️ ${q.title}</span>
          <span class="quest-summary-actions">
            ${statusBadge}
          </span>
        </summary>

        <div class="quest-accordion-content">
          ${state === 'closed' ? `
            <!-- BADGES CONTAINER -->
            <div class="tag-container" style="margin-top:6px; margin-bottom:8px;">
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

            <!-- DESCRIPTION -->
            ${q.description ? `<p style="font-size:13px; color:#cbd5e1; margin:6px 0 10px 0; line-height:1.45;">${q.description}</p>` : ''}

            <!-- ACTIONS: CLOSED -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; gap:8px;">
              <button class="btn-battle-action btn-battle-hero" style="flex:1; min-height:40px; font-size:13px; font-weight:bold; border-radius:6px; text-transform:none;" onclick="qmLaunchBattle('${q.id}')">
                Open
              </button>
              <button class="btn-delete" style="min-height:40px; padding:8px 14px; font-size:13px; font-weight:bold; justify-content:center; border-radius:6px;" onclick="qmDeleteQuest('${q.id}', '${(q.title || '').replace(/'/g, "\\'")}')" title="Delete battle from catalog">
                🗑️ Delete
              </button>
            </div>
          ` : `
            <!-- 1. DUAL QUEUE ROSTER (SIDE-BY-SIDE ON TOP, LIKE BATTLE LINE) -->
            <div class="dual-queue-grid" style="margin-top:6px; margin-bottom:12px;">
              <div class="queue-box hero-box">
                <div>
                  <div class="queue-header-row">
                    <h5 class="queue-header-title" style="color:#38bdf8;">Heroes Line</h5>
                    <span class="queue-count-pill" style="color:#38bdf8; border:1px solid rgba(56,189,248,0.3);">${heroMembers.length}</span>
                  </div>
                  <div class="queue-roster-list">
                    ${heroMembers.length > 0
                      ? heroMembers.map(m => {
                          const p = m.profiles;
                          const uName = p?.username || 'Warrior';
                          const abs = Array.isArray(p?.quest_abilities) ? p.quest_abilities : [];
                          const absBadge = (rules.monstersAreNpc && abs.length > 0)
                            ? abs.map(a => `<span class="ability-pill">${a}</span>`).join('')
                            : '';
                          return `
                            <span class="party-member-tag" style="justify-content:space-between; gap:4px;">
                              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;">
                                👤 ${uName}${absBadge}
                              </span>
                              <button onclick="qmKickHeroFromQueue('${m.id}', '${(uName).replace(/'/g, "\\'")}')" 
                                title="Kick ${uName} from Heroes Line" 
                                style="background:none; border:none; color:#f87171; cursor:pointer; font-size:12px; padding:0 2px; line-height:1;">
                                ✖
                              </button>
                            </span>
                          `;
                        }).join('')
                      : '<p style="font-size:11px; color:#64748b; margin:6px 0; font-style:italic; text-align:center;">No heroes yet.</p>'
                    }
                  </div>
                </div>
              </div>

              <div class="queue-box monster-box">
                <div>
                  <div class="queue-header-row">
                    <h5 class="queue-header-title" style="color:#f43f5e;">Monster Line</h5>
                    <span class="queue-count-pill" style="color:#f43f5e; border:1px solid rgba(244,63,94,0.3);">${monsterMembers.length}</span>
                  </div>
                  <div class="queue-roster-list">
                    ${monsterMembers.length > 0
                      ? monsterMembers.map(m => {
                          const p = m.profiles;
                          const uName = p?.username || 'Monster';
                          const abs = Array.isArray(p?.quest_abilities) ? p.quest_abilities : [];
                          const absBadge = (rules.monstersAreNpc && abs.length > 0)
                            ? abs.map(a => `<span class="ability-pill" style="border-color:rgba(244,63,94,0.4); color:#fda4af; background:rgba(244,63,94,0.15);">${a}</span>`).join('')
                            : '';
                          return `
                            <span class="party-member-tag" style="border-color:rgba(244,63,94,0.3); justify-content:space-between; gap:4px;">
                              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;">
                                👤 ${uName}${absBadge}
                              </span>
                              <button onclick="qmKickMonsterFromQueue('${m.id}', '${(uName).replace(/'/g, "\\'")}')" 
                                title="Kick ${uName} from Monster Line" 
                                style="background:none; border:none; color:#f87171; cursor:pointer; font-size:12px; padding:0 2px; line-height:1;">
                                ✖
                              </button>
                            </span>
                          `;
                        }).join('')
                      : '<p style="font-size:11px; color:#64748b; margin:6px 0; font-style:italic; text-align:center;">No monsters yet.</p>'
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. ONE-TAP VICTOR RESOLUTION GRID -->
            <div class="qm-victor-grid" style="margin-top:4px; margin-bottom:10px;">
              <button class="btn-qm-victor btn-qm-victor-hero" onclick="qmFinishBattle('${queueId}', '${q.id}', ${victoryGold}, ${defeatGold}, 'heroes')">
                Heroes Won
              </button>

              <button class="btn-qm-victor btn-qm-victor-monster" onclick="qmFinishBattle('${queueId}', '${q.id}', ${victoryGold}, ${defeatGold}, 'monsters')">
                Monsters Won
              </button>
            </div>

            <!-- 3. BADGES CONTAINER (Below Line & Resolution) -->
            <div class="tag-container" style="margin-bottom:8px;">
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

            <!-- 4. DESCRIPTION TEXT -->
            ${q.description ? `<p style="font-size:13px; color:#cbd5e1; margin:6px 0 10px 0; line-height:1.45;">${q.description}</p>` : ''}

            <!-- 5. QM CONTROLS (BOTTOM) -->
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:8px;">
              ${state === 'open' ? `
                <button class="btn-accept" style="flex:2; min-height:40px; font-size:13px; font-weight:bold; border-radius:6px;" onclick="qmStartCombat('${queueId}', '${q.id}')">
                  Go Live
                </button>
              ` : `
                <button style="flex:2; min-height:40px; font-size:13px; font-weight:bold; background:#27272a; color:#a1a1aa; border:1px solid #3f3f46; border-radius:6px; opacity:0.8; cursor:not-allowed; display:flex; align-items:center; justify-content:center;" disabled>
                  Live
                </button>
              `}
              <button class="btn-leave" style="flex:1; min-height:40px; font-size:13px; font-weight:bold; border-radius:6px;" onclick="qmCloseBattle('${q.id}', '${queueId}')">
                Close
              </button>
              <button class="btn-delete" style="min-height:40px; padding:8px 14px; font-size:13px; font-weight:bold; justify-content:center; border-radius:6px;" onclick="qmDeleteQuest('${q.id}', '${(q.title || '').replace(/'/g, "\\'")}')" title="Delete battle from catalog">
                🗑️ Delete
              </button>
            </div>
          `}
        </div>
      </details>
    `;
  }).join('');
}

async function qmLaunchBattle(questId) {
  const { error: questError } = await supabaseClient
    .from('quests')
    .update({ is_active: true })
    .eq('id', questId);

  if (questError) {
    alert("Error launching battle: " + questError.message);
    return;
  }

  // Ensure an open queue exists with status 'waiting'
  const { data: existingQueues } = await supabaseClient
    .from('quest_queues')
    .select('id')
    .eq('quest_id', questId)
    .in('status', ['waiting', 'active']);

  if (!existingQueues || existingQueues.length === 0) {
    const { error: queueError } = await supabaseClient
      .from('quest_queues')
      .insert({ quest_id: questId, status: 'waiting' });
    if (queueError) {
      alert("Error opening line: " + queueError.message);
      return;
    }
  }

  await fetchUserSlotState();
  await fetchQMQueues();
  await fetchQuests();
  await fetchMonsterEncounters();
}

async function qmStartCombat(queueId, questId) {
  if (!queueId && questId) {
    await supabaseClient.from('quest_queues').insert({ quest_id: questId, status: 'active' });
  } else if (queueId) {
    const { error } = await supabaseClient
      .from('quest_queues')
      .update({ status: 'active' })
      .eq('id', queueId);
    if (error) {
      alert("Error starting combat: " + error.message);
      return;
    }
  }

  await fetchUserSlotState();
  await fetchQMQueues();
  await fetchQuests();
  await fetchMonsterEncounters();
}

async function qmCloseBattle(questId, queueId) {
  if (!confirm("Close/withdraw this battle from the field? Active queues will be closed.")) return;

  const updates = [
    supabaseClient.from('quests').update({ is_active: false }).eq('id', questId)
  ];
  if (queueId) {
    updates.push(supabaseClient.from('quest_queues').update({ status: 'completed' }).eq('id', queueId));
    updates.push(supabaseClient.from('encounter_monsters').update({ status: 'completed' }).eq('queue_id', queueId));
  } else {
    updates.push(supabaseClient.from('quest_queues').update({ status: 'completed' }).eq('quest_id', questId).in('status', ['waiting', 'active']));
  }

  await Promise.allSettled(updates);

  await fetchUserSlotState();
  await fetchQMQueues();
  await fetchQuests();
  await fetchMonsterEncounters();
}

async function qmFinishBattle(queueId, questId, victoryGold, defeatGold, explicitVictor = null) {
  const victorEl = document.getElementById(`qm-victor-${queueId || questId}`);
  const victor = explicitVictor || (victorEl ? victorEl.value : 'heroes');

  // Fetch current fighters in this queue
  let pcUserIds = [];
  let monsterUserIds = [];

  if (queueId) {
    const { data: queueData } = await supabaseClient
      .from('quest_queues')
      .select(`
        id,
        quest_id,
        queue_members(user_id),
        encounter_monsters(user_id)
      `)
      .eq('id', queueId)
      .single();

    if (queueData) {
      pcUserIds = (queueData.queue_members || []).map(m => m.user_id).filter(Boolean);
      monsterUserIds = (queueData.encounter_monsters || []).map(m => m.user_id).filter(Boolean);
      if (!questId && queueData.quest_id) {
        questId = queueData.quest_id;
      }
    }
  }

  // Fetch quest details to get durability & participant rules
  let questData = null;
  if (questId) {
    const { data: qd } = await supabaseClient
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single();
    questData = qd;
  }

  const rules = typeof getQuestDurabilityRules === 'function' 
    ? getQuestDurabilityRules(questData) 
    : { monstersAreNpc: false, allowedTypes: ['Trinket', 'Talisman', 'Artifact'], defeatGold: 0, durabilityWear: 1, defeatPenalty: 'none' };

  const effectiveVictoryGold = Number(victoryGold) || Number(questData?.reward_gold) || 0;
  const effectiveDefeatGold = Number(defeatGold) || Number(questData?.reward_gold_defeat) || Number(rules.defeatGold) || 0;

  const heroGold = victor === 'heroes' ? effectiveVictoryGold : effectiveDefeatGold;
  const monsterGold = victor === 'monsters' ? effectiveVictoryGold : effectiveDefeatGold;
  const victorName = victor === 'heroes' ? '⚔️ HEROES' : '👹 MONSTERS';

  const wearAmount = Number.isFinite(rules.durabilityWear) ? Number(rules.durabilityWear) : 1;
  const defeatPenalty = rules.defeatPenalty || 'none';

  let stakesWarning = '';
  if (defeatPenalty === 'items_lost') {
    stakesWarning = `\n\n⚠️ HIGH STAKES (Items Lost): Losing team will LOSE ALL active pouch items!`;
  } else if (defeatPenalty === 'total_ruin') {
    stakesWarning = `\n\n☠️ TOTAL RUIN ACTIVE: Losing team will LOSE ALL active pouch items AND have Gold reset to 0!`;
  }

  const confirmMsg = `Declare ${victorName} the Victor?\n\n` +
    `• Heroes Line (${pcUserIds.length} players): ${heroGold}g each (${victor === 'heroes' ? 'VICTORY' : 'DEFEAT'})\n` +
    `• Monster Line (${monsterUserIds.length} players): ${monsterGold}g each (${victor === 'monsters' ? 'VICTORY' : 'DEFEAT'})\n\n` +
    `Item Wear Rules:\n` +
    `• Magic Items Active: ${rules.allowedTypes.length > 0 ? rules.allowedTypes.join(', ') : 'None (Restricted)'}\n` +
    `• Gear Wear Amount: ${wearAmount} durability per battle\n` +
    `• Monster Team: ${rules.monstersAreNpc ? 'Monsters are NPCs (NO wear)' : 'Monsters take item wear'}` +
    stakesWarning + `\n\n` +
    `Distribute rewards and execute combat resolution?`;

  if (!confirm(confirmMsg)) return;

  // 1. Award Gold to Heroes
  const heroPayouts = pcUserIds.map(uid => awardFighterGold(uid, heroGold));

  // 2. Award Gold to Monsters
  const monsterPayouts = monsterUserIds.map(uid => awardFighterGold(uid, monsterGold));

  // 3. Durability wear on Heroes
  const heroDurabilityWear = pcUserIds.map(uid => applyCombatDurabilityDamage(uid, rules.allowedTypes, wearAmount));

  // 4. Durability wear on Monsters (skip if monsters are NPCs)
  const monsterDurabilityWear = rules.monstersAreNpc
    ? []
    : monsterUserIds.map(uid => applyCombatDurabilityDamage(uid, rules.allowedTypes, wearAmount));

  // 5. Execute Defeat Penalty (Items Lost or Total Ruin) on the defeated team
  const losingUserIds = victor === 'heroes' 
    ? (rules.monstersAreNpc ? [] : monsterUserIds) 
    : pcUserIds;

  const defeatPenaltyPromises = (defeatPenalty !== 'none')
    ? losingUserIds.map(uid => executeDefeatPenalty(uid, defeatPenalty))
    : [];

  // 6. RNG Loot Drops for winners (if enabled)
  const winningUserIds = victor === 'heroes' 
    ? pcUserIds 
    : (rules.monstersAreNpc ? [] : monsterUserIds);

  let lootNotice = '';
  if (rules.rngLootDrops && winningUserIds.length > 0 && typeof rollItemLootDrops === 'function') {
    const battleDrops = await rollItemLootDrops(winningUserIds, true, questData?.qm_id, questData?.park, questData?.kingdom);
    if (battleDrops && battleDrops.length > 0) {
      const dropDetails = battleDrops.map(d => `• ${d.username}: ${d.items.join(', ')}`).join('\n');
      lootNotice = `\n\n🎲 MYSTERY LOOT DROPS:\n${dropDetails}`;
    } else {
      lootNotice = `\n\n🎲 Mystery Loot: Rolls were cast for ${winningUserIds.length} winner(s), but no items dropped.`;
    }
  }

  // 7. Mark queues completed and close battle quest
  const queueUpdates = [];
  if (queueId) {
    queueUpdates.push(supabaseClient.from('quest_queues').update({ status: 'completed' }).eq('id', queueId));
    queueUpdates.push(supabaseClient.from('encounter_monsters').update({ status: 'completed' }).eq('queue_id', queueId));
  }
  if (questId) {
    queueUpdates.push(supabaseClient.from('quests').update({ is_active: false }).eq('id', questId));
  }

  await Promise.allSettled([...heroPayouts, ...monsterPayouts, ...heroDurabilityWear, ...monsterDurabilityWear, ...defeatPenaltyPromises, ...queueUpdates]);

  alert(`🎉 Battle finished! ${victorName} victorious!\nRewards distributed and combat results processed.${lootNotice}`);
  initDashboard();
}

// Roll Mystery Item Loot Drops for winning adventurers
async function rollItemLootDrops(winnerUserIds, isBattle = true, customQMId = null, customPark = null, customKingdom = null) {
  if (!Array.isArray(winnerUserIds) || winnerUserIds.length === 0) return [];
  const activePark = customPark || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
  const activeKingdom = customKingdom || (typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard");
  const activeQMId = (customQMId !== undefined && customQMId !== null) ? customQMId : (currentQMId || null);

  const trinketItems = STORE_CATALOG.filter(i => i.category === 'Trinket' || i.category === 'Trinkets');
  const talismanItems = STORE_CATALOG.filter(i => i.category === 'Talisman' || i.category === 'Talismans');
  const artifactItems = STORE_CATALOG.filter(i => i.category === 'Artifact' || i.category === 'Artifacts' || i.category === 'Legendary');

  const trinketConfig = (typeof RNG_LOOT_DROP_RATES !== 'undefined' && RNG_LOOT_DROP_RATES.trinket) || { rolls: 3, chance: 0.25 };
  const talismanConfig = (typeof RNG_LOOT_DROP_RATES !== 'undefined' && RNG_LOOT_DROP_RATES.talisman) || { rolls: 2, chance: 0.05 };
  const artifactConfig = (typeof RNG_LOOT_DROP_RATES !== 'undefined' && RNG_LOOT_DROP_RATES.artifact) || { rolls: 1, chance: 1 / 250 };

  // Fetch usernames so we can report drops clearly to the QM & UI
  let usernameMap = new Map();
  try {
    const { data: userProfiles } = await supabaseClient
      .from('profiles')
      .select('id, username')
      .in('id', winnerUserIds);

    (userProfiles || []).forEach(p => {
      if (p && p.id) usernameMap.set(p.id, p.username || 'Adventurer');
    });
  } catch (err) {
    console.warn("Could not fetch user profiles for loot drop report", err);
  }

  const allAwardedDrops = [];

  for (const uid of winnerUserIds) {
    const wonItems = [];

    // Trinket rolls (3 rolls @ 25% chance each)
    for (let i = 0; i < (trinketConfig.rolls || 3); i++) {
      if (Math.random() < trinketConfig.chance && trinketItems.length > 0) {
        const picked = trinketItems[Math.floor(Math.random() * trinketItems.length)];
        wonItems.push(picked);
      }
    }

    // Talisman rolls (2 rolls @ 5% chance each)
    for (let i = 0; i < (talismanConfig.rolls || 2); i++) {
      if (Math.random() < talismanConfig.chance && talismanItems.length > 0) {
        const picked = talismanItems[Math.floor(Math.random() * talismanItems.length)];
        wonItems.push(picked);
      }
    }

    // Artifact rolls (1 roll @ 1/250 chance = 0.4%)
    for (let i = 0; i < (artifactConfig.rolls || 1); i++) {
      if (Math.random() < artifactConfig.chance && artifactItems.length > 0) {
        const picked = artifactItems[Math.floor(Math.random() * artifactItems.length)];
        wonItems.push(picked);
      }
    }

    if (wonItems.length === 0) continue;

    // Fetch user inventory to check capacity
    const { data: userItems, error: invFetchErr } = await supabaseClient
      .from('user_inventory')
      .select('*')
      .eq('user_id', uid)
      .eq('park', activePark);

    if (invFetchErr) {
      console.error(`Error fetching inventory for user ${uid} during loot roll:`, invFetchErr);
    }

    const parkItems = (userItems || []).filter(item => !item.qm_id || !activeQMId || item.qm_id === activeQMId);
    let runningPouch = parkItems.filter(item => !item.storage_location || item.storage_location === 'pouch');
    let runningBank = parkItems.filter(item => item.storage_location === 'bank');

    const awardedNames = [];

    for (const item of wonItems) {
      const cat = getCategoryForItemName(item.item_name);
      let normCat = cat;
      if (normCat === 'Talisman') normCat = 'Talismans';
      if (normCat === 'Artifact' || normCat === 'Legendary') normCat = 'Artifacts';
      if (normCat === 'Trinkets') normCat = 'Trinket';

      const pouchLimit = (STORAGE_LIMITS.pouch && (STORAGE_LIMITS.pouch[normCat] || STORAGE_LIMITS.pouch[cat])) || 1;
      const bankLimit = (STORAGE_LIMITS.bank && (STORAGE_LIMITS.bank[normCat] || STORAGE_LIMITS.bank[cat])) || 1;

      const pouchCount = runningPouch.filter(i => {
        let c = getCategoryForItemName(i.item_name);
        if (c === 'Talisman') c = 'Talismans';
        if (c === 'Artifact' || c === 'Legendary') c = 'Artifacts';
        if (c === 'Trinkets') c = 'Trinket';
        return c === normCat;
      }).length;

      const bankCount = runningBank.filter(i => {
        let c = getCategoryForItemName(i.item_name);
        if (c === 'Talisman') c = 'Talismans';
        if (c === 'Artifact' || c === 'Legendary') c = 'Artifacts';
        if (c === 'Trinkets') c = 'Trinket';
        return c === normCat;
      }).length;

      let destLocation = null;
      if (pouchCount < pouchLimit) {
        destLocation = 'pouch';
      } else if (bankCount < bankLimit) {
        destLocation = 'bank';
      }

      if (!destLocation) {
        console.warn(`Loot drop: User ${uid} has full pouch and bank for ${normCat}. Item "${item.item_name}" could not be stored.`);
        continue;
      }

      const durMax = item.durability_max || (typeof getItemDurabilityMax === 'function' ? getItemDurabilityMax(item.item_name) : 1);

      const payload = {
        user_id: uid,
        item_name: item.item_name,
        base_cost: item.base_cost || 1,
        quantity: 1,
        durability_current: durMax,
        durability_max: durMax,
        storage_location: destLocation,
        park: activePark,
        kingdom: activeKingdom,
        qm_id: activeQMId
      };

      let insPayload = { ...payload };
      let { error: insErr } = await supabaseClient.from('user_inventory').insert(insPayload);
      if (insErr && insErr.message && insErr.message.includes('qm_id')) {
        delete insPayload.qm_id;
        const retry = await supabaseClient.from('user_inventory').insert(insPayload);
        insErr = retry.error;
      }
      if (insErr && insErr.message && insErr.message.includes('storage_location')) {
        delete insPayload.storage_location;
        const retry = await supabaseClient.from('user_inventory').insert(insPayload);
        insErr = retry.error;
      }

      if (insErr) {
        console.error(`Failed to insert loot drop item "${item.item_name}" for user ${uid}:`, insErr);
      } else {
        awardedNames.push(`${item.item_name} (${destLocation === 'pouch' ? '🎒 Pouch' : '🏦 Bank'})`);
        if (destLocation === 'pouch') runningPouch.push(payload);
        else runningBank.push(payload);
      }
    }

    if (awardedNames.length > 0) {
      allAwardedDrops.push({
        userId: uid,
        username: usernameMap.get(uid) || 'Adventurer',
        items: awardedNames
      });

      if (currentUser && currentUser.id === uid) {
        alert(`🎲 MYSTERY LOOT DROP!\n\nYou discovered:\n• ${awardedNames.join('\n• ')}`);
        try {
          localStorage.setItem('qf_last_inventory_seen_' + currentUser.id, new Date().toISOString());
        } catch (e) {}
      }
    }
  }

  return allAwardedDrops;
}

async function executeDefeatPenalty(userId, penalty) {
  if (!userId || !penalty || penalty === 'none') return;
  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId || null;

  try {
    if (penalty === 'items_lost') {
      // 1. Wipe ONLY active POUCH items for this park & QM (Bank vault items are safe!)
      let invQuery = supabaseClient
        .from('user_inventory')
        .delete()
        .eq('user_id', userId)
        .eq('park', activePark)
        .neq('storage_location', 'bank');

      if (activeQMId) {
        invQuery = invQuery.eq('qm_id', activeQMId);
      }
      await invQuery;
    } else if (penalty === 'total_ruin') {
      // 1. Wipe ALL inventory items (Pouch + Bank) for this park & QM
      let invQuery = supabaseClient
        .from('user_inventory')
        .delete()
        .eq('user_id', userId)
        .eq('park', activePark);

      if (activeQMId) {
        invQuery = invQuery.eq('qm_id', activeQMId);
      }
      await invQuery;

      // 2. Reset gold to 0
      let profQuery = supabaseClient
        .from('user_park_profiles')
        .update({ gold: 0 })
        .eq('user_id', userId)
        .eq('park', activePark);

      if (activeQMId) {
        profQuery = profQuery.eq('qm_id', activeQMId);
      }
      await profQuery;

      if (currentUser && currentUser.id === userId) {
        if (currentParkProfile) currentParkProfile.gold = 0;
        if (currentProfile) currentProfile.gold = 0;
        if (typeof syncGoldDisplays === 'function') syncGoldDisplays(0);
      }
    }
  } catch (err) {
    console.error('Error executing defeat penalty:', err);
  }
}

async function awardFighterGold(userId, goldAmt) {
  if (!userId || !goldAmt || goldAmt <= 0) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : (typeof getKingdomForPark === 'function' ? getKingdomForPark(activePark) : 'The Freeholds of Amtgard');
  const activeQMId = currentQMId || null;

  try {
    // 1. Fetch or initialize the user's specific park & QM reign character sheet
    let profileQuery = supabaseClient
      .from('user_park_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('park', activePark);

    if (activeQMId) {
      profileQuery = profileQuery.eq('qm_id', activeQMId);
    }

    const { data: existingParkProfile } = await profileQuery.maybeSingle();

    let nextGold = goldAmt;
    if (existingParkProfile) {
      nextGold = (Number(existingParkProfile.gold) || 0) + goldAmt;
      await supabaseClient
        .from('user_park_profiles')
        .update({ gold: nextGold })
        .eq('id', existingParkProfile.id);
    } else {
      const { data: inserted } = await supabaseClient
        .from('user_park_profiles')
        .insert({
          user_id: userId,
          park: activePark,
          kingdom: activeKingdom,
          qm_id: activeQMId,
          role: (activeQMId && userId === activeQMId) ? 'questmaster' : 'player',
          gold: nextGold
        })
        .select('*')
        .maybeSingle();
      if (inserted && currentUser && currentUser.id === userId) {
        currentParkProfile = inserted;
      }
    }

    // 2. Also update profiles table for backward compatibility with global counters
    const { data: p } = await supabaseClient
      .from('profiles')
      .select('gold, park_gold')
      .eq('id', userId)
      .maybeSingle();

    if (p) {
      let parkGoldMap = p.park_gold;
      if (typeof parkGoldMap === 'string') {
        try { parkGoldMap = JSON.parse(parkGoldMap); } catch (e) { parkGoldMap = {}; }
      }
      if (!parkGoldMap || typeof parkGoldMap !== 'object') parkGoldMap = {};
      parkGoldMap[activePark] = nextGold;

      await supabaseClient
        .from('profiles')
        .update({
          gold: (Number(p.gold) || 0) + goldAmt,
          park_gold: parkGoldMap
        })
        .eq('id', userId);
    }

    // 3. If this is the current active player, update active state and UI immediately
    if (currentUser && currentUser.id === userId) {
      if (!currentParkProfile) {
        currentParkProfile = { user_id: userId, park: activePark, kingdom: activeKingdom, qm_id: activeQMId, gold: nextGold };
      } else {
        currentParkProfile.gold = nextGold;
      }
      if (!currentProfile) currentProfile = {};
      currentProfile.gold = nextGold;
      if (typeof syncGoldDisplays === 'function') {
        syncGoldDisplays(nextGold);
      }
    }
  } catch (err) {
    console.error(`Error awarding ${goldAmt}g to user ${userId}:`, err);
  }
}

// Backward compatibility aliases
async function qmSetQueueStatus(queueId, status) {
  return qmStartCombat(queueId);
}
async function qmCompleteAndPayEncounter(queueId, rewardGold, pcUserIds, monsterUserIds) {
  return qmFinishBattle(queueId, null, rewardGold, 0);
}

// QM Kick Player Handlers for Battle Queues
async function qmKickHeroFromQueue(memberId, username) {
  const confirmed = confirm(`Remove "${username}" from the Heroes Line?\n\nThis will remove them from the battle and free up their slot.`);
  if (!confirmed) return;

  try {
    const { error } = await supabaseClient
      .from('queue_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      alert("Error removing hero: " + error.message);
      return;
    }

    alert(`🚫 ${username} removed from Heroes Line.`);
    await fetchQMQueues();
    await fetchUserSlotState();
    await fetchQuests();
    await fetchMonsterEncounters();
  } catch (err) {
    console.error("Error kicking hero from queue:", err);
    alert("Error: " + (err.message || err));
  }
}

async function qmKickMonsterFromQueue(claimId, username) {
  const confirmed = confirm(`Remove "${username}" from the Monster Line?\n\nThis will remove them from the battle and free up their slot.`);
  if (!confirmed) return;

  try {
    const { error } = await supabaseClient
      .from('encounter_monsters')
      .delete()
      .eq('id', claimId);

    if (error) {
      alert("Error removing monster: " + error.message);
      return;
    }

    alert(`🚫 ${username} removed from Monster Line.`);
    await fetchQMQueues();
    await fetchUserSlotState();
    await fetchQuests();
    await fetchMonsterEncounters();
  } catch (err) {
    console.error("Error kicking monster from queue:", err);
    alert("Error: " + (err.message || err));
  }
}

window.qmKickHeroFromQueue = qmKickHeroFromQueue;
window.qmKickMonsterFromQueue = qmKickMonsterFromQueue;
