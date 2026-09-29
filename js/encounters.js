// ==============================================================================
// Quest-Forge: Monster Encounters, PC Lines, & Questmaster Queue Controls
// ==============================================================================

async function fetchMonsterEncounters() {
  const availableMonsterContainer = document.getElementById('available-monster-encounters');
  if (!availableMonsterContainer) return;

  const { data: combatQuests } = await supabaseClient
    .from('quests')
    .select('*')
    .eq('is_active', true)
    .or('category.eq.Battle,category.eq.Combat');

  if (!combatQuests || combatQuests.length === 0) {
    availableMonsterContainer.innerHTML = `<p class="empty-state">No Active Quests.</p>`;
    return;
  }

  const monsterQuestIds = combatQuests.map(q => q.id);
  let monsterRosterByQuest = new Map();

  if (monsterQuestIds.length > 0) {
    const { data: monsterLines } = await supabaseClient
      .from('quest_queues')
      .select('id, quest_id, status, encounter_monsters(*, profiles(username))')
      .in('quest_id', monsterQuestIds)
      .in('status', ['waiting', 'active']);

    (monsterLines || []).forEach(line => {
      if (!line || !line.quest_id) return;
      const roster = (line.encounter_monsters || []).map(member => member.profiles?.username || 'Monster').filter(Boolean);
      monsterRosterByQuest.set(line.quest_id, {
        queueId: line.id,
        queueStatus: line.status,
        players: roster,
        count: roster.length
      });
    });
  }

  const isBattleLocked = !!activeBattleQuest;

  availableMonsterContainer.innerHTML = combatQuests.map(q => renderMonsterQuestCard(q, activeMonsterClaim, monsterRosterByQuest.get(q.id), isBattleLocked)).join('');
}

function renderMonsterQuestCard(q, activeMonsterClaim, monsterRoster = null, isBattleLocked = false) {
  const joinedThisQuest = activeMonsterClaim && activeMonsterClaim.quest_queues?.quest_id === q.id;
  const isJoined = Boolean(joinedThisQuest);
  const groupType = q.participation_type || 'Group';
  const joinButton = isJoined
    ? `<button class="btn-leave" onclick="abandonMonsterRole('${activeMonsterClaim.id}')">Leave</button>`
    : (isBattleLocked
      ? `<button class="btn-secondary" disabled style="opacity:0.6;">Battle Slot Full</button>`
      : `<button class="btn-join" onclick="claimMonsterRole('${q.id}', 'Standard Monster')">Join</button>`);

  const summaryAction = `<span class="quest-summary-actions">${joinButton}</span>`;
  const rosterPlayers = monsterRoster?.players || [];
  const rosterHtml = rosterPlayers.length > 0
    ? rosterPlayers.map(name => `<span class="party-member-tag">👹 ${name}</span>`).join('')
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
              <span class="badge badge-type">${groupType}</span>
              <span class="badge badge-battle">${q.threat_level || 'Safe'}</span>
            </div>
            <p>${q.description || ''}</p>
            <div class="queue-roster-strip">
              <h5>Queued Monsters (${rosterPlayers.length})</h5>
              <div>${rosterHtml}</div>
            </div>
          </div>
        </div>
      </div>
    </details>
  `;
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
    .eq('status', 'waiting')
    .limit(1);

  let queueId = null;

  if (existingQueues && existingQueues.length > 0) {
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

  alert("Joined Monster's queue!");
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
    .eq('status', 'waiting')
    .limit(1);

  let queueId = null;

  if (existingQueues && existingQueues.length > 0) {
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

  alert("Joined Heroes queue!");
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

  // 1. Fetch all combat/battle quests
  const { data: battleQuests, error: questError } = await supabaseClient
    .from('quests')
    .select('*')
    .or('category.eq.Battle,category.eq.Combat')
    .order('created_at', { ascending: false });

  if (questError) {
    container.innerHTML = `<p class="empty-state" style="color:var(--danger);">Error loading battles: ${questError.message}</p>`;
    return;
  }

  if (!battleQuests || battleQuests.length === 0) {
    container.innerHTML = `<p class="empty-state">No battle quests found. Create one in the Forge Quest tab!</p>`;
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
    const victoryGold = Number(q.reward_gold) || 0;
    const defeatGold = Number(q.reward_gold_defeat) || 0;

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
    let borderColor = '#3f3f46';
    let statusBadge = `<span class="badge badge-draft">🔴 STANDBY</span>`;
    if (state === 'live') {
      borderColor = '#dc2626';
      statusBadge = `<span class="badge badge-active" style="background:#dc2626; color:white; border-color:#ef4444;">⚔️ LIVE IN COMBAT</span>`;
    } else if (state === 'prepped') {
      borderColor = 'var(--gold)';
      statusBadge = `<span class="badge badge-threat-loot" style="background:#ca8a04; color:#0f172a; border-color:#eab308;">⏳ PREPPED (LINE OPEN)</span>`;
    }

    const pcs = activeQueue?.queue_members ? activeQueue.queue_members.map(m => m.profiles).filter(Boolean) : [];
    const monsters = activeQueue?.encounter_monsters ? activeQueue.encounter_monsters.map(m => m.profiles).filter(Boolean) : [];
    const queueId = activeQueue?.id || '';

    return `
      <div class="quest-card" style="border: 2px solid ${borderColor}; margin-bottom: 16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <h4 style="margin:0 0 4px 0;">${q.title}</h4>
            <div class="tag-container" style="margin-bottom:6px;">
              <span class="badge badge-battle">Battle</span>
              <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold);">🏆 Victory: +${victoryGold}g</span>
              <span class="badge badge-type" style="color:#94a3b8; border-color:#64748b;">💀 Defeat: +${defeatGold}g</span>
              ${q.repeatable ? '<span class="badge badge-adventure">🔁 Repeatable</span>' : ''}
            </div>
          </div>
          <div>${statusBadge}</div>
        </div>

        ${q.description ? `<p style="font-size:13px; color:var(--text-muted); margin:4px 0 10px 0;">${q.description}</p>` : ''}

        ${q.scenario_card ? `
          <div class="scenario-card-box" style="margin-bottom:12px;">
            <h5 style="color:var(--warning); margin:0 0 4px 0; font-size:12px;">🔒 Secret Scenario Card</h5>
            <p style="font-size:12px; margin:0;">${q.scenario_card}</p>
          </div>
        ` : ''}

        ${state === 'closed' ? `
          <!-- STATE 1: CLOSED / STANDBY -->
          <div style="margin-top:12px;">
            <button class="btn-accept" style="width:100%; font-size:13px; padding:10px;" onclick="qmLaunchBattle('${q.id}')">
              🚀 Launch Battle to Field (Open Line)
            </button>
          </div>
        ` : `
          <!-- DUAL QUEUE ROSTER (PREPPED OR LIVE) -->
          <div class="dual-queue-grid" style="margin-bottom:12px;">
            <div class="queue-box">
              <h5 style="color:var(--primary); margin:0 0 6px 0;">⚔️ Heroes / PC Line (${pcs.length})</h5>
              ${pcs.length > 0
                ? pcs.map(p => `<span class="party-member-tag">👤 ${p?.username || 'Warrior'}</span>`).join('')
                : '<p style="font-size:11px; color:var(--text-muted); margin:4px 0;">No heroes in line yet.</p>'
              }
            </div>

            <div class="queue-box" style="border-color:var(--monster);">
              <h5 style="color:var(--monster); margin:0 0 6px 0;">👹 Monster Line (${monsters.length})</h5>
              ${monsters.length > 0
                ? monsters.map(m => `<span class="party-member-tag" style="border-color:var(--monster);">👹 ${m?.username || 'Monster'}</span>`).join('')
                : '<p style="font-size:11px; color:var(--text-muted); margin:4px 0;">No monsters in line yet.</p>'
              }
            </div>
          </div>

          <!-- ALWAYS-PRESENT VICTOR SELECTION BOX -->
          <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:6px; padding:10px; margin-bottom:12px;">
            <label for="qm-victor-${queueId || q.id}" style="font-weight:bold; font-size:12px; color:var(--gold); display:block; margin-bottom:6px;">
              🏆 Who is the Victor?
            </label>
            <select id="qm-victor-${queueId || q.id}" class="filter-select" style="width:100%; padding:8px; font-size:13px; border-radius:4px; background:var(--bg-secondary); color:var(--text); border:1px solid var(--border);">
              <option value="heroes" selected>⚔️ Heroes Win (Heroes: ${victoryGold}g | Monsters: ${defeatGold}g)</option>
              <option value="monsters">👹 Monsters Win (Monsters: ${victoryGold}g | Heroes: ${defeatGold}g)</option>
            </select>
          </div>

          <!-- CONTROLS BASED ON STATE -->
          ${state === 'prepped' ? `
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn-accept" style="flex:2; min-width:140px; font-size:13px; padding:8px;" onclick="qmStartCombat('${queueId}', '${q.id}')">
                ⚔️ Start Combat (Go Live)
              </button>
              <button class="btn-complete" style="flex:2; min-width:140px; font-size:13px; padding:8px;" onclick="qmFinishBattle('${queueId}', '${q.id}', ${victoryGold}, ${defeatGold})">
                🏁 Finish Battle
              </button>
              <button class="btn-leave" style="flex:1; min-width:90px; font-size:12px; padding:8px;" onclick="qmCloseBattle('${q.id}', '${queueId}')">
                🛑 Close
              </button>
            </div>
          ` : `
            <div style="display:flex; gap:8px;">
              <button class="btn-complete" style="flex:3; font-size:14px; padding:10px;" onclick="qmFinishBattle('${queueId}', '${q.id}', ${victoryGold}, ${defeatGold})">
                🏁 Finish Battle & Distribute Rewards
              </button>
              <button class="btn-leave" style="flex:1; font-size:12px; padding:10px;" onclick="qmCloseBattle('${q.id}', '${queueId}')">
                🛑 Abort
              </button>
            </div>
          `}
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

async function qmFinishBattle(queueId, questId, victoryGold, defeatGold) {
  const victorEl = document.getElementById(`qm-victor-${queueId || questId}`);
  const victor = victorEl ? victorEl.value : 'heroes';

  // Fetch current fighters in this queue
  let pcUserIds = [];
  let monsterUserIds = [];

  if (queueId) {
    const { data: queueData } = await supabaseClient
      .from('quest_queues')
      .select(`
        id,
        queue_members(user_id),
        encounter_monsters(user_id)
      `)
      .eq('id', queueId)
      .single();

    if (queueData) {
      pcUserIds = (queueData.queue_members || []).map(m => m.user_id).filter(Boolean);
      monsterUserIds = (queueData.encounter_monsters || []).map(m => m.user_id).filter(Boolean);
    }
  }

  const heroGold = victor === 'heroes' ? victoryGold : defeatGold;
  const monsterGold = victor === 'monsters' ? victoryGold : defeatGold;
  const victorName = victor === 'heroes' ? '⚔️ HEROES' : '👹 MONSTERS';

  const confirmMsg = `Declare ${victorName} the Victor?\n\n` +
    `• Heroes Line (${pcUserIds.length} players): ${heroGold}g each (${victor === 'heroes' ? 'VICTORY' : 'DEFEAT'})\n` +
    `• Monster Line (${monsterUserIds.length} players): ${monsterGold}g each (${victor === 'monsters' ? 'VICTORY' : 'DEFEAT'})\n\n` +
    `This will distribute gold, apply gear durability wear to Heroes, and conclude the battle.`;

  if (!confirm(confirmMsg)) return;

  // 1. Award Gold to Heroes
  const heroPayouts = pcUserIds.map(uid => awardFighterGold(uid, heroGold));

  // 2. Award Gold to Monsters
  const monsterPayouts = monsterUserIds.map(uid => awardFighterGold(uid, monsterGold));

  // 3. Durability wear on Heroes
  const durabilityWear = pcUserIds.map(uid => applyCombatDurabilityDamage(uid));

  // 4. Mark queues completed and close battle quest
  const queueUpdates = [];
  if (queueId) {
    queueUpdates.push(supabaseClient.from('quest_queues').update({ status: 'completed' }).eq('id', queueId));
    queueUpdates.push(supabaseClient.from('encounter_monsters').update({ status: 'completed' }).eq('queue_id', queueId));
  }
  if (questId) {
    queueUpdates.push(supabaseClient.from('quests').update({ is_active: false }).eq('id', questId));
  }

  await Promise.allSettled([...heroPayouts, ...monsterPayouts, ...durabilityWear, ...queueUpdates]);

  alert(`🎉 Battle finished! ${victorName} victorious!\nRewards distributed and equipment durability updated.`);
  initDashboard();
}

async function awardFighterGold(userId, goldAmt) {
  if (!userId || !goldAmt || goldAmt <= 0) return;

  const { data: p } = await supabaseClient
    .from('profiles')
    .select('gold, park, park_gold')
    .eq('id', userId)
    .single();

  if (!p) return;

  const park = p.park || "Delver's Rest";
  let parkGoldMap = p.park_gold;
  if (typeof parkGoldMap === 'string') {
    try { parkGoldMap = JSON.parse(parkGoldMap); } catch (e) { parkGoldMap = {}; }
  }
  if (!parkGoldMap || typeof parkGoldMap !== 'object') parkGoldMap = {};

  const currentParkAmt = Number(parkGoldMap[park]) || 0;
  const nextGold = currentParkAmt + goldAmt;
  parkGoldMap[park] = nextGold;

  // Update profiles
  await supabaseClient.from('profiles').update({
    gold: (p.gold || 0) + goldAmt,
    park_gold: parkGoldMap
  }).eq('id', userId);

  // Update user_park_profiles
  await supabaseClient.from('user_park_profiles').upsert({
    user_id: userId,
    park: park,
    kingdom: typeof getKingdomForPark === 'function' ? getKingdomForPark(park) : 'The Freeholds of Amtgard',
    gold: nextGold
  }, { onConflict: 'user_id, park' });

  // Reactive sync if current logged-in user
  if (currentUser && currentUser.id === userId) {
    if (!currentProfile) currentProfile = {};
    currentProfile.park_gold = parkGoldMap;
    if (!currentParkProfile) currentParkProfile = {};
    if (currentParkProfile.park === park) currentParkProfile.gold = nextGold;
    const activePark = typeof getActivePark === 'function' ? getActivePark() : park;
    currentProfile.gold = Number(parkGoldMap[activePark]) || 0;
    const goldEl = document.getElementById('profile-gold');
    if (goldEl) goldEl.innerText = currentProfile.gold;
  }
}

// Backward compatibility aliases
async function qmSetQueueStatus(queueId, status) {
  return qmStartCombat(queueId);
}
async function qmCompleteAndPayEncounter(queueId, rewardGold, pcUserIds, monsterUserIds) {
  return qmFinishBattle(queueId, null, rewardGold, 0);
}
