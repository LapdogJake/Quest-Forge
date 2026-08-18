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
            <div class="quest-rewards">
              <span class="reward-qp"> +1 Monster Point</span>
            </div>
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

async function fetchQMQueues() {
  const container = document.getElementById('qm-queue-list');
  if (!container) return;

  const { data: queues } = await supabaseClient
    .from('quest_queues')
    .select(`
      *, 
      quests(*), 
      queue_members(*, profiles(id, username)),
      encounter_monsters(*, profiles(id, username))
    `)
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: true });

  if (!queues || queues.length === 0) {
    container.innerHTML = `<p class="empty-state">No live encounter lines open on the field.</p>`;
    return;
  }

  container.innerHTML = queues.map(qq => {
    if (!qq.quests) return '';
    const pcs = qq.queue_members ? qq.queue_members.map(m => m.profiles) : [];
    const monsters = qq.encounter_monsters ? qq.encounter_monsters.map(m => m.profiles) : [];
    const isLive = qq.status === 'active';

    return `
      <div class="quest-card" style="border: 2px solid ${isLive ? 'var(--success)' : 'var(--gold)'};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h4>${qq.quests.title}</h4>
          <span class="badge ${isLive ? 'badge-active' : 'badge-threat-loot'}">${isLive ? '⚔️ IN PROGRESS' : '⏳ PREPPING'}</span>
        </div>

        <div class="dual-queue-grid">
          <div class="queue-box">
            <h5 style="color:var(--primary);">⚔️ PC Line (${pcs.length})</h5>
            ${pcs.length > 0
              ? pcs.map(p => `<span class="party-member-tag">👤 ${p?.username || 'Warrior'}</span>`).join('')
              : '<p style="font-size:11px; color:var(--text-muted);">No PCs yet</p>'
            }
          </div>

          <div class="queue-box" style="border-color:var(--monster);">
            <h5 style="color:var(--monster);">👹 Monster Line (${monsters.length})</h5>
            ${monsters.length > 0
              ? monsters.map(m => `<span class="party-member-tag" style="border-color:var(--monster);">👹 ${m?.username || 'Monster'}</span>`).join('')
              : '<p style="font-size:11px; color:var(--text-muted);">No monsters yet</p>'
            }
          </div>
        </div>

        ${qq.quests.scenario_card ? `
          <div class="scenario-card-box">
            <h5>🔒 Secret Scenario Card</h5>
            <p>${qq.quests.scenario_card}</p>
          </div>
        ` : ''}

        <div style="display:flex; gap:8px; margin-top:12px;">
          ${!isLive ? `
            <button class="btn-accept" style="width:50%;" onclick="qmSetQueueStatus('${qq.id}', 'active')">🚀 Launch Encounter</button>
          ` : ''}
          <button class="btn-complete" style="width:${isLive ? '100%' : '50%'};" 
            onclick="qmCompleteAndPayEncounter('${qq.id}', ${qq.quests.reward_gold}, ${qq.quests.reward_qp}, ${JSON.stringify((qq.queue_members || []).map(m => m.user_id || m.profiles?.id).filter(Boolean)).replace(/"/g, '&quot;')}, ${JSON.stringify((qq.encounter_monsters || []).map(m => m.user_id || m.profiles?.id).filter(Boolean)).replace(/"/g, '&quot;')})">
            🏆 Complete & Pay All
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function qmSetQueueStatus(queueId, status) {
  await supabaseClient.from('quest_queues').update({ status }).eq('id', queueId);
  await fetchUserSlotState();
  fetchQMQueues();
  fetchQuests();
  fetchMonsterEncounters();
}

async function qmCompleteAndPayEncounter(queueId, rewardGold, rewardQp, pcUserIds, monsterUserIds) {
  if (!confirm(`Award PCs (+${rewardGold}g / +${rewardQp}qp) AND Monsters (+1 Shift Credit / +${rewardGold}g / +${rewardQp}qp)?`)) return;

  // 1. Concurrently award PCs
  const pcPayoutPromises = (pcUserIds || []).map(async (userId) => {
    const { data: p } = await supabaseClient.from('profiles').select('gold, quest_points').eq('id', userId).single();
    if (p) {
      await supabaseClient.from('profiles').update({
        gold: (p.gold || 0) + rewardGold,
        quest_points: (p.quest_points || 0) + rewardQp
      }).eq('id', userId);
    }
  });

  // 2. Concurrently award Monsters
  const monsterPayoutPromises = (monsterUserIds || []).map(async (userId) => {
    const { data: m } = await supabaseClient.from('profiles').select('gold, quest_points, monster_shifts').eq('id', userId).single();
    if (m) {
      await supabaseClient.from('profiles').update({
        gold: (m.gold || 0) + rewardGold,
        quest_points: (m.quest_points || 0) + rewardQp,
        monster_shifts: (m.monster_shifts || 0) + 1
      }).eq('id', userId);
    }
  });

  // 3. Concurrently close queue and monster lines
  const queueClosePromises = [
    supabaseClient.from('quest_queues').update({ status: 'completed' }).eq('id', queueId),
    supabaseClient.from('encounter_monsters').update({ status: 'completed' }).eq('queue_id', queueId)
  ];

  await Promise.allSettled([...pcPayoutPromises, ...monsterPayoutPromises, ...queueClosePromises]);

  // 4. Concurrently apply combat durability damage to all PCs
  const durabilityPromises = (pcUserIds || []).map(userId => applyCombatDurabilityDamage(userId));
  await Promise.allSettled(durabilityPromises);

  alert("🎉 Encounter completed! Rewards distributed to PCs and Monsters.");
  initDashboard();
}
