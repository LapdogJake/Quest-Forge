// ==============================================================================
// Quest-Forge: Monster Encounters, PC Lines, & Questmaster Queue Controls
// ==============================================================================

async function fetchMonsterEncounters() {
  const availableMonsterContainer = document.getElementById('available-monster-encounters');
  if (!availableMonsterContainer) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId;
  const activeQMName = typeof getActiveQMUsername === 'function' ? getActiveQMUsername() : 'Default Realm';

  const { data: combatQuests } = await supabaseClient
    .from('quests')
    .select('*')
    .eq('is_active', true)
    .or('category.eq.Battle,category.eq.Combat');

  const parkCombatQuests = (combatQuests || []).filter(q => 
    (!q.park || q.park === activePark) &&
    (!q.qm_id || !activeQMId || q.qm_id === activeQMId)
  );

  if (!parkCombatQuests || parkCombatQuests.length === 0) {
    availableMonsterContainer.innerHTML = `<p class="empty-state">No Active Battles in ${activePark} (${activeQMName}).</p>`;
    return;
  }

  const monsterQuestIds = parkCombatQuests.map(q => q.id);
  let monsterRosterByQuest = new Map();

  if (monsterQuestIds.length > 0) {
    const { data: monsterLines } = await supabaseClient
      .from('quest_queues')
      .select('id, quest_id, status, queue_members(*, profiles(id, username)), encounter_monsters(*, profiles(id, username))')
      .in('quest_id', monsterQuestIds)
      .in('status', ['waiting', 'active']);

    (monsterLines || []).forEach(line => {
      if (!line || !line.quest_id) return;
      const heroRoster = (line.queue_members || []).map(member => member.profiles?.username || 'Hero').filter(Boolean);
      const monsterRoster = (line.encounter_monsters || []).map(member => member.profiles?.username || 'Monster').filter(Boolean);
      const userHeroMember = (line.queue_members || []).find(m => m.user_id === currentUser?.id || m.profiles?.id === currentUser?.id);
      const userMonsterMember = (line.encounter_monsters || []).find(m => m.user_id === currentUser?.id || m.profiles?.id === currentUser?.id);

      monsterRosterByQuest.set(line.quest_id, {
        queueId: line.id,
        queueStatus: line.status,
        heroPlayers: heroRoster,
        monsterPlayers: monsterRoster,
        joinedHeroQueueId: userHeroMember ? line.id : null,
        joinedMonsterClaimId: userMonsterMember ? userMonsterMember.id : null
      });
    });
  }

  availableMonsterContainer.innerHTML = parkCombatQuests.map(q => 
    typeof renderAvailableQuestCard === 'function'
      ? renderAvailableQuestCard(q, 'combat', null, monsterRosterByQuest.get(q.id))
      : renderMonsterQuestCard(q, activeMonsterClaim, monsterRosterByQuest.get(q.id), !!activeBattleQuest)
  ).join('');
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

  const { data: existingQueues } = await supabaseClient
    .from('quest_queues')
    .select('*')
    .eq('quest_id', questId)
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingQueues && existingQueues.length > 0 && existingQueues[0].status === 'active') {
    alert("⚠️ This battle is currently active in combat! You cannot join or switch sides while the battle is live.");
    return;
  }

  let queueId = null;

  if (existingQueues && existingQueues.length > 0 && existingQueues[0].status === 'waiting') {
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

  const { data: existingQueues } = await supabaseClient
    .from('quest_queues')
    .select('*')
    .eq('quest_id', questId)
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingQueues && existingQueues.length > 0 && existingQueues[0].status === 'active') {
    alert("⚠️ This battle is currently active in combat! You cannot join or switch sides while the battle is live.");
    return;
  }

  let queueId = null;

  if (existingQueues && existingQueues.length > 0 && existingQueues[0].status === 'waiting') {
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

  const battleQuests = (allBattleQuests || []).filter(q => 
    (!q.park || q.park === activePark) &&
    (!q.qm_id || !activeQMId || q.qm_id === activeQMId)
  );

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
      queue_members(*, profiles(id, username)),
      encounter_monsters(*, profiles(id, username))
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

  // 3. Render cards with state management (Standby -> Prepping -> Live -> Finish)
  container.innerHTML = battleQuests.map(q => {
    const activeQueue = queuesByQuest.get(q.id);
    const rules = typeof getQuestDurabilityRules === 'function' 
      ? getQuestDurabilityRules(q) 
      : { monstersAreNpc: false, allowedTypes: ['Trinket', 'Talisman', 'Artifact'], defeatGold: 0 };
    const victoryGold = Number(q.reward_gold) || 0;
    const defeatGold = Number(q.reward_gold_defeat) || Number(rules.defeatGold) || 0;

    // Determine state
    let state = 'closed'; // 'closed' | 'prepped' | 'live'
    if (activeQueue) {
      if (activeQueue.status === 'active') {
        state = 'live';
      } else if (activeQueue.status === 'waiting') {
        state = 'prepped';
      }
    } else if (q.is_active) {
      state = 'prepped';
    }

    // Border and badge styles based on state
    let borderColor = 'rgba(255,255,255,0.12)';
    let statusBadge = `<span class="badge badge-draft" style="font-size:11px;">🔴 STANDBY (CLOSED)</span>`;
    if (state === 'live') {
      borderColor = '#dc2626';
      statusBadge = `<span class="badge badge-active" style="background:#dc2626; color:white; border-color:#ef4444; font-size:11px; font-weight:bold;">⚔️ LIVE IN COMBAT</span>`;
    } else if (state === 'prepped') {
      borderColor = 'var(--gold)';
      statusBadge = `<span class="badge badge-threat-loot" style="background:#ca8a04; color:#0f172a; border-color:#eab308; font-size:11px; font-weight:bold;">⏳ OPEN LINE (GATHERING)</span>`;
    }

    const pcs = activeQueue?.queue_members ? activeQueue.queue_members.map(m => m.profiles).filter(Boolean) : [];
    const monsters = activeQueue?.encounter_monsters ? activeQueue.encounter_monsters.map(m => m.profiles).filter(Boolean) : [];
    const queueId = activeQueue?.id || '';

    const scenarioClean = (q.scenario_card || '').replace(/<!--\s*RULES:.*?-->/gs, '').trim();

    return `
      <div class="quest-card battle-card" style="border: 2px solid ${borderColor}; margin-bottom: 16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <h4 style="margin:0 0 4px 0; font-size:16px; font-weight:800;">⚔️ ${q.title}</h4>
            <div class="tag-container" style="margin-bottom:6px;">
              <span class="badge badge-battle">Battle</span>
              <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold); font-weight:bold;">🏆 Win: +${victoryGold}g</span>
              <span class="badge badge-type" style="color:#94a3b8; border-color:#64748b;">💀 Loss: +${defeatGold}g</span>
              ${rules.monstersAreNpc 
                ? '<span class="badge badge-monster" title="Monster queue does not lose durability">👹 NPC Monsters</span>' 
                : '<span class="badge badge-type" title="Monster queue loses durability on active items">👹 Monster Wear</span>'}
              ${rules.allowedTypes.length === 3 
                ? '<span class="badge badge-active">✨ All Items Active</span>' 
                : (rules.allowedTypes.length === 0 
                  ? '<span class="badge badge-threat-loot">🚫 No Magic Items</span>' 
                  : `<span class="badge badge-type">✨ ${rules.allowedTypes.join(', ')}</span>`)}
              ${q.repeatable ? '<span class="badge badge-quest">🔁 Repeatable</span>' : ''}
            </div>
          </div>
          <div>${statusBadge}</div>
        </div>

        ${q.description ? `<p style="font-size:13px; color:#cbd5e1; margin:4px 0 10px 0;">${q.description}</p>` : ''}

        ${scenarioClean ? `
          <div class="secret-briefing-card" style="margin-bottom:12px;">
            <div class="secret-briefing-header">
              <span>🔒</span>
              <h5>Secret Scenario Briefing (Encrypted for Players until Live)</h5>
            </div>
            <p class="secret-briefing-content">${scenarioClean}</p>
          </div>
        ` : ''}

        ${state === 'closed' ? `
          <!-- STATE 1: CLOSED / STANDBY -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; gap:8px;">
            <button class="btn-battle-action btn-battle-hero" style="flex:1;" onclick="qmLaunchBattle('${q.id}')">
              🚀 Launch Battle (Open Line)
            </button>
            <button class="btn-delete" style="padding:12px 14px;" onclick="qmDeleteQuest('${q.id}', '${(q.title || '').replace(/'/g, "\\'")}')" title="Delete battle from catalog">
              🗑️ Delete
            </button>
          </div>
        ` : `
          <!-- DUAL QUEUE ROSTER (SIDE-BY-SIDE) -->
          <div class="dual-queue-grid">
            <div class="queue-box hero-box">
              <div>
                <div class="queue-header-row">
                  <h5 class="queue-header-title" style="color:#38bdf8;">⚔️ Heroes Line</h5>
                  <span class="queue-count-pill" style="color:#38bdf8; border:1px solid rgba(56,189,248,0.3);">${pcs.length}</span>
                </div>
                <div class="queue-roster-list">
                  ${pcs.length > 0
                    ? pcs.map(p => `<span class="party-member-tag">👤 ${p?.username || 'Warrior'}</span>`).join('')
                    : '<p style="font-size:11px; color:#64748b; margin:6px 0; font-style:italic; text-align:center;">No heroes yet.</p>'
                  }
                </div>
              </div>
            </div>

            <div class="queue-box monster-box">
              <div>
                <div class="queue-header-row">
                  <h5 class="queue-header-title" style="color:#f43f5e;">👹 Monster Line</h5>
                  <span class="queue-count-pill" style="color:#f43f5e; border:1px solid rgba(244,63,94,0.3);">${monsters.length}</span>
                </div>
                <div class="queue-roster-list">
                  ${monsters.length > 0
                    ? monsters.map(m => `<span class="party-member-tag" style="border-color:rgba(244,63,94,0.3);">👹 ${m?.username || 'Monster'}</span>`).join('')
                    : '<p style="font-size:11px; color:#64748b; margin:6px 0; font-style:italic; text-align:center;">No monsters yet.</p>'
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- STREAMLINED ONE-TAP VICTOR RESOLUTION GRID -->
          <div style="margin-top:10px; margin-bottom:12px;">
            <p style="font-size:11px; font-weight:bold; color:var(--gold); text-transform:uppercase; margin:0 0 6px 0; text-align:center;">
              ⚡ Declare Winner & Instant Payout (${pcs.length + monsters.length} fighters)
            </p>
            <div class="qm-victor-grid">
              <button class="btn-qm-victor btn-qm-victor-hero" onclick="qmFinishBattle('${queueId}', '${q.id}', ${victoryGold}, ${defeatGold}, 'heroes')">
                <span class="btn-qm-victor-title">🏆 Heroes Won</span>
                <span class="btn-qm-victor-sub">Heroes +${victoryGold}g | Monsters +${defeatGold}g</span>
              </button>

              <button class="btn-qm-victor btn-qm-victor-monster" onclick="qmFinishBattle('${queueId}', '${q.id}', ${victoryGold}, ${defeatGold}, 'monsters')">
                <span class="btn-qm-victor-title">🏆 Monsters Won</span>
                <span class="btn-qm-victor-sub">Monsters +${victoryGold}g | Heroes +${defeatGold}g</span>
              </button>
            </div>
          </div>

          <!-- QM FIELD MANAGEMENT BUTTONS -->
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            ${state === 'prepped' ? `
              <button class="btn-accept" style="flex:2; min-height:44px; font-size:13px; font-weight:bold;" onclick="qmStartCombat('${queueId}', '${q.id}')">
                ⚔️ Start Combat (Go Live)
              </button>
            ` : `
              <button class="btn-secondary" style="flex:2; min-height:44px; font-size:13px; font-weight:bold; background:#dc2626; color:white;" disabled>
                ⚔️ BATTLE IS CURRENTLY LIVE
              </button>
            `}
            <button class="btn-leave" style="flex:1; min-height:44px; font-size:12px;" onclick="qmCloseBattle('${q.id}', '${queueId}')">
              🛑 Abort / Close
            </button>
            <button class="btn-delete" style="min-height:44px; padding:8px 12px;" onclick="qmDeleteQuest('${q.id}', '${(q.title || '').replace(/'/g, "\\'")}')" title="Delete battle from catalog">
              🗑️
            </button>
          </div>
        `}
      </div>
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
    : { monstersAreNpc: false, allowedTypes: ['Trinket', 'Talisman', 'Artifact'], defeatGold: 0 };

  const effectiveVictoryGold = Number(victoryGold) || Number(questData?.reward_gold) || 0;
  const effectiveDefeatGold = Number(defeatGold) || Number(questData?.reward_gold_defeat) || Number(rules.defeatGold) || 0;

  const heroGold = victor === 'heroes' ? effectiveVictoryGold : effectiveDefeatGold;
  const monsterGold = victor === 'monsters' ? effectiveVictoryGold : effectiveDefeatGold;
  const victorName = victor === 'heroes' ? '⚔️ HEROES' : '👹 MONSTERS';

  const confirmMsg = `Declare ${victorName} the Victor?\n\n` +
    `• Heroes Line (${pcUserIds.length} players): ${heroGold}g each (${victor === 'heroes' ? 'VICTORY' : 'DEFEAT'})\n` +
    `• Monster Line (${monsterUserIds.length} players): ${monsterGold}g each (${victor === 'monsters' ? 'VICTORY' : 'DEFEAT'})\n\n` +
    `Item Wear Rules:\n` +
    `• Magic Items Active: ${rules.allowedTypes.length > 0 ? rules.allowedTypes.join(', ') : 'None (Restricted)'}\n` +
    `• Monster Queue Wear: ${rules.monstersAreNpc ? 'NPC (NO wear)' : 'Active (Takes wear)'}\n\n` +
    `Distribute gold & durability wear?`;

  if (!confirm(confirmMsg)) return;

  // 1. Award Gold to Heroes
  const heroPayouts = pcUserIds.map(uid => awardFighterGold(uid, heroGold));

  // 2. Award Gold to Monsters
  const monsterPayouts = monsterUserIds.map(uid => awardFighterGold(uid, monsterGold));

  // 3. Durability wear on Heroes (always applies to active items)
  const heroDurabilityWear = pcUserIds.map(uid => applyCombatDurabilityDamage(uid, rules.allowedTypes));

  // 4. Durability wear on Monsters:
  // If monsters are NPC, NO wear is applied to monsters!
  // If monsters are NOT NPC (default for normal battles), monsters take wear on allowed items!
  const monsterDurabilityWear = rules.monstersAreNpc
    ? []
    : monsterUserIds.map(uid => applyCombatDurabilityDamage(uid, rules.allowedTypes));

  // 5. Mark queues completed and close battle quest
  const queueUpdates = [];
  if (queueId) {
    queueUpdates.push(supabaseClient.from('quest_queues').update({ status: 'completed' }).eq('id', queueId));
    queueUpdates.push(supabaseClient.from('encounter_monsters').update({ status: 'completed' }).eq('queue_id', queueId));
  }
  if (questId) {
    queueUpdates.push(supabaseClient.from('quests').update({ is_active: false }).eq('id', questId));
  }

  await Promise.allSettled([...heroPayouts, ...monsterPayouts, ...heroDurabilityWear, ...monsterDurabilityWear, ...queueUpdates]);

  alert(`🎉 Battle finished! ${victorName} victorious!\nRewards distributed and equipment durability updated.`);
  initDashboard();
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
