// ==============================================================================
// Quest-Forge: Player Battle Tab (Multi-Team PvP / PvM Queues & Battle Cards)
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

  const combatQuestById = new Map();
  (combatQuests || []).forEach(q => combatQuestById.set(q.id, q));

  const combatQuestIds = (combatQuests || []).map(q => q.id);
  const queueRosterByQuest = new Map();

  if (combatQuestIds.length > 0) {
    const { data: queuedBattleLines } = await supabaseClient
      .from('quest_queues')
      .select('id, quest_id, status, queue_members(*, profiles(id, username, quest_abilities)), encounter_monsters(*, profiles(id, username, quest_abilities))')
      .in('quest_id', combatQuestIds)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false });

    (queuedBattleLines || []).forEach(line => {
      if (!line || !line.quest_id || queueRosterByQuest.has(line.quest_id)) return;

      const questObj = combatQuestById.get(line.quest_id);
      const rules = typeof getQuestDurabilityRules === 'function'
        ? getQuestDurabilityRules(questObj)
        : { activeTeams: ['red', 'blue'], playerTeams: ['red', 'blue'], hasMonsters: false };

      const rostersByTeam = {};
      rules.activeTeams.forEach(tk => { rostersByTeam[tk] = []; });

      let joinedTeamKey = null;
      let joinedQueueId = null;
      let joinedMonsterClaimId = null;

      // 1. Process queue_members (supports all 6 player color teams + 'monster')
      (line.queue_members || []).forEach(member => {
        const rawTeam = member.team || member.role_name || '';
        const teamKey = typeof normalizeBattleMemberTeam === 'function'
          ? normalizeBattleMemberTeam(rawTeam, rules.activeTeams)
          : (rules.activeTeams[0] || 'red');

        if (!rostersByTeam[teamKey]) rostersByTeam[teamKey] = [];
        rostersByTeam[teamKey].push({
          id: member.id,
          userId: member.user_id || member.profiles?.id,
          username: member.profiles?.username || 'Hero',
          abilities: member.profiles?.quest_abilities || [],
          sourceTable: 'queue_members',
          teamKey
        });

        if (currentUser && (member.user_id === currentUser.id || member.profiles?.id === currentUser.id)) {
          joinedTeamKey = teamKey;
          joinedQueueId = line.id;
        }
      });

      // 2. Process encounter_monsters (legacy Monster table fallback)
      (line.encounter_monsters || []).forEach(member => {
        const targetTeam = rules.activeTeams.includes('monster')
          ? 'monster'
          : (rules.activeTeams[1] || rules.activeTeams[0] || 'monster');

        if (!rostersByTeam[targetTeam]) rostersByTeam[targetTeam] = [];
        const uid = member.user_id || member.profiles?.id;
        const alreadyListed = rostersByTeam[targetTeam].some(m => m.userId && m.userId === uid);
        if (!alreadyListed) {
          rostersByTeam[targetTeam].push({
            id: member.id,
            userId: uid,
            username: member.profiles?.username || 'Monster',
            abilities: member.profiles?.quest_abilities || [],
            sourceTable: 'encounter_monsters',
            teamKey: targetTeam
          });
        }

        if (currentUser && uid === currentUser.id) {
          joinedTeamKey = targetTeam;
          joinedQueueId = line.id;
          joinedMonsterClaimId = member.id;
        }
      });

      queueRosterByQuest.set(line.quest_id, {
        queueId: line.id,
        queueStatus: line.status,
        rostersByTeam,
        joinedTeamKey,
        joinedQueueId,
        joinedMonsterClaimId,
        // Legacy properties for backward compatibility
        heroPlayers: rostersByTeam[rules.playerTeams[0] || 'red'] || [],
        monsterPlayers: rostersByTeam['monster'] || rostersByTeam[rules.playerTeams[1] || 'blue'] || []
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

// Render a Multi-Team Battle Card on the Player Battle Tab (#available-combat-quests)
function renderBattleQuestCard(q, joinedQueueId = null, queueRoster = null, isCardOpen = false) {
  const isSlotLocked = Boolean(activeBattleQuest || activeMonsterClaim);
  const rules = typeof getQuestDurabilityRules === 'function'
    ? getQuestDurabilityRules(q)
    : {
        allowedTypes: ['Trinket', 'Talisman', 'Artifact'],
        battleMode: 'pvp',
        activeTeams: ['red', 'blue'],
        playerTeams: ['red', 'blue'],
        hasMonsters: false,
        monstersAreNpc: false,
        placementRewards: [15, 10, 10, 10, 10, 10],
        monsterReward: 10,
        isRankedPayout: false,
        victoryGold: 15,
        defeatGold: 10
      };

  const activeTeams = Array.isArray(rules.activeTeams) && rules.activeTeams.length > 0
    ? rules.activeTeams
    : ['red', 'blue'];

  const rostersByTeam = queueRoster?.rostersByTeam || {};
  const myTeamKey = queueRoster?.joinedTeamKey || (joinedQueueId ? activeTeams[0] : null);
  const myQueueId = queueRoster?.joinedQueueId || joinedQueueId || '';
  const myMonsterClaimId = queueRoster?.joinedMonsterClaimId || (activeMonsterClaim && activeMonsterClaim.quest_queues?.quest_id === q.id ? activeMonsterClaim.id : '');

  const isLive = queueRoster?.queueStatus === 'active';
  const isOpen = Boolean(isCardOpen);

  const statusBadge = isLive
    ? '<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; padding:2px 4px; border:none;">🟠 Live</span>'
    : (q.is_active || queueRoster
      ? '<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; padding:2px 4px; border:none;">🟢 Open</span>'
      : '<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; padding:2px 4px; border:none;">⚪ Closed</span>');

  const myTeamMeta = myTeamKey && typeof getBattleTeamMeta === 'function'
    ? getBattleTeamMeta(myTeamKey)
    : null;

  // Build dynamic team queue boxes
  const teamBoxesHtml = activeTeams.map((teamKey, idx) => {
    const meta = typeof getBattleTeamMeta === 'function'
      ? getBattleTeamMeta(teamKey)
      : { key: teamKey, label: teamKey, shortLabel: teamKey, icon: '⚔️', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)', boxClass: 'hero-box', btnClass: 'btn-battle-hero' };

    const teamPlayers = rostersByTeam[teamKey] || [];
    const isJoinedThisTeam = myTeamKey === teamKey;

    // Span full width if odd number of total boxes and this is either the Monster line first or the final odd player team
    const isOddTotal = activeTeams.length % 2 === 1;
    const shouldSpanFull = isOddTotal && (teamKey === 'monster' || (!activeTeams.includes('monster') && idx === activeTeams.length - 1));

    const rosterHtml = teamPlayers.length > 0
      ? teamPlayers.map(p => {
          const name = typeof p === 'object' ? p.username : p;
          const abs = (typeof p === 'object' && Array.isArray(p.abilities)) ? p.abilities : [];
          const isMe = currentUser && (name === currentProfile?.username || name === currentUser.username || p.userId === currentUser.id);
          const showAbilities = rules.battleMode === 'pvm' || rules.monstersAreNpc || teamKey === 'monster';
          const absBadge = (showAbilities && abs.length > 0)
            ? abs.map(a => `<span class="ability-pill" style="border-color:${meta.border}; color:${meta.color};">${a}</span>`).join('')
            : '';
          return `<span class="party-member-tag ${isMe ? 'is-current-user' : ''}" style="border-color:${meta.border};">👤 ${name}${absBadge}</span>`;
        }).join('')
      : '<p style="font-size:11px; color:#64748b; margin:6px 0; font-style:italic; text-align:center;">Line is empty.</p>';

    let actionBtnHtml = '';
    if (isLive) {
      if (isJoinedThisTeam) {
        actionBtnHtml = `
          <button class="btn-battle-action ${meta.btnClass}" disabled style="opacity:0.95; cursor:default;">
            IN COMBAT
          </button>
        `;
      } else if (rules.allowMidJoin) {
        if (isSlotLocked) {
          actionBtnHtml = `
            <button class="btn-battle-action btn-battle-disabled" disabled>
              ${myTeamMeta ? `IN ${myTeamMeta.shortLabel.toUpperCase()}` : 'SLOT FULL'}
            </button>
          `;
        } else {
          actionBtnHtml = `
            <button class="btn-battle-action ${meta.btnClass}" onclick="joinBattleTeam('${q.id}', '${teamKey}')">
              JOIN ${meta.shortLabel.toUpperCase()}
            </button>
          `;
        }
      } else {
        actionBtnHtml = `
          <button class="btn-battle-action btn-battle-disabled" disabled>
            BATTLE LIVE
          </button>
        `;
      }
    } else {
      if (isJoinedThisTeam) {
        actionBtnHtml = `
          <button class="btn-battle-action btn-battle-leave" onclick="leaveBattleTeam('${myQueueId}', '${myMonsterClaimId}')">
            LEAVE
          </button>
        `;
      } else if (isSlotLocked) {
        actionBtnHtml = `
          <button class="btn-battle-action btn-battle-disabled" disabled>
            ${myTeamMeta ? `IN ${myTeamMeta.shortLabel.toUpperCase()}` : 'SLOT FULL'}
          </button>
        `;
      } else {
        actionBtnHtml = `
          <button class="btn-battle-action ${meta.btnClass}" onclick="joinBattleTeam('${q.id}', '${teamKey}')">
            JOIN
          </button>
        `;
      }
    }

    return `
      <div class="queue-box ${meta.boxClass} ${shouldSpanFull ? 'span-full' : ''} ${isJoinedThisTeam ? 'joined-active' : ''}">
        <div>
          <div class="queue-header-row">
            <h5 class="queue-header-title" style="color:${meta.color};">${meta.icon} ${meta.label}</h5>
            <span class="queue-count-pill" style="color:${meta.color}; border:1px solid ${meta.border};">${teamPlayers.length}</span>
          </div>
          <div class="queue-roster-list">
            ${rosterHtml}
          </div>
        </div>
        <div>
          ${actionBtnHtml}
        </div>
      </div>
    `;
  }).join('');

  // Build Mode & Reward Badges
  const modeBadge = rules.battleMode === 'pvm'
    ? '<span class="badge badge-monster" title="Player vs Monster (Monsters are NPCs with 0 gear wear)">👹 PvM</span>'
    : '<span class="badge badge-active" style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.35);">⚔️ PvP</span>';

  const playerCount = Math.max(1, rules.playerTeams?.length || 2);
  const rewards = Array.isArray(rules.placementRewards) ? rules.placementRewards : [rules.victoryGold || 15, rules.defeatGold || 10];
  let rewardBadgesHtml = '';

  if (rules.isRankedPayout && playerCount > 2) {
    const rankLabels = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th', '5th', '6th'];
    rewardBadgesHtml = Array.from({ length: playerCount }, (_, idx) => {
      const amt = rewards[idx] ?? rewards[rewards.length - 1] ?? 0;
      const isFirst = idx === 0;
      return `<span class="badge badge-type" style="${isFirst ? 'color:var(--gold); border-color:var(--gold); font-weight:bold;' : 'color:#cbd5e1; border-color:#475569;'}">${rankLabels[idx]}: +${amt}g</span>`;
    }).join('');
  } else {
    const winGold = rewards[0] ?? rules.victoryGold ?? 15;
    const lossGold = rewards[1] ?? rules.defeatGold ?? 10;
    rewardBadgesHtml = `
      <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold); font-weight:bold;">+${winGold}g Win</span>
      ${playerCount > 1 ? `<span class="badge badge-type" style="color:#94a3b8; border-color:#64748b;">+${lossGold}g Loss</span>` : ''}
    `;
  }

  if (rules.hasMonsters) {
    rewardBadgesHtml += `<span class="badge badge-type" style="color:#fda4af; border-color:rgba(244,63,94,0.4);">👹 Monster: +${rules.monsterReward ?? 10}g</span>`;
  }

  return `
    <details class="quest-accordion battle-accordion" data-quest-id="${q.id}" ${isOpen ? 'open' : ''}>
      <summary>
        <span class="quest-summary-title">${q.title}</span>
        <span class="quest-summary-actions">
          ${statusBadge}
        </span>
      </summary>
      <div class="quest-accordion-content">
        <!-- 1. The Multi-Team Queue Grid on top -->
        <div class="dual-queue-grid" style="margin-top:4px; margin-bottom:12px;">
          ${teamBoxesHtml}
        </div>

        <!-- 2. The Badges below the Queue lines -->
        <div class="tag-container" style="margin-bottom:10px;">
          ${modeBadge}
          ${rewardBadgesHtml}
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
// Player Battle Queue Actions (Supports All 6 Color Teams + Monsters)
// ------------------------------------------------------------------------------

async function joinBattleTeam(questId, teamKey = 'red') {
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

  const normalizedKey = String(teamKey || 'red').toLowerCase();
  const meta = typeof getBattleTeamMeta === 'function'
    ? getBattleTeamMeta(normalizedKey)
    : { label: normalizedKey, icon: '⚔️' };

  // Insert into queue_members with team & role_name, with resilient schema fallback
  let joinError = null;
  const { error: err1 } = await supabaseClient
    .from('queue_members')
    .insert({ queue_id: queueId, user_id: currentUser.id, role_name: normalizedKey, team: normalizedKey });

  if (err1) {
    // Fallback if 'team' column hasn't been added yet
    const { error: err2 } = await supabaseClient
      .from('queue_members')
      .insert({ queue_id: queueId, user_id: currentUser.id, role_name: normalizedKey });

    if (err2) {
      // Fallback if 'role_name' also wasn't present on queue_members
      if (normalizedKey === 'monster') {
        const { error: monsterErr } = await supabaseClient.from('encounter_monsters').insert({
          queue_id: queueId,
          user_id: currentUser.id,
          role_name: 'monster',
          status: 'claimed'
        });
        joinError = monsterErr;
      } else {
        const { error: err3 } = await supabaseClient
          .from('queue_members')
          .insert({ queue_id: queueId, user_id: currentUser.id });
        joinError = err3;
      }
    }
  }

  if (joinError && !joinError.message.includes('duplicate')) {
    alert("Error joining line: " + joinError.message);
    return;
  }

  alert(`${meta.icon} Joined ${meta.label}!`);
  await fetchUserSlotState();
  await fetchQuests();
  if (currentProfile?.role === 'questmaster' || currentProfile?.role === 'admin') {
    fetchQMQueues();
  }
}

async function leaveBattleTeam(queueId, monsterClaimId = '') {
  const ops = [];
  if (queueId) {
    ops.push(supabaseClient.from('queue_members').delete().eq('queue_id', queueId).eq('user_id', currentUser.id));
    ops.push(supabaseClient.from('encounter_monsters').delete().eq('queue_id', queueId).eq('user_id', currentUser.id));
  }
  if (monsterClaimId) {
    ops.push(supabaseClient.from('encounter_monsters').delete().eq('id', monsterClaimId));
  }
  await Promise.allSettled(ops);

  await fetchUserSlotState();
  await fetchQuests();
  if (currentProfile?.role === 'questmaster' || currentProfile?.role === 'admin') {
    fetchQMQueues();
  }
}

// Backward-compatible wrappers
async function joinOrCreateGroupQueue(questId) {
  return joinBattleTeam(questId, 'red');
}

async function leaveQueue(queueId) {
  return leaveBattleTeam(queueId, '');
}

async function claimMonsterRole(questId, roleName) {
  return joinBattleTeam(questId, 'monster');
}

async function abandonMonsterRole(claimId) {
  return leaveBattleTeam('', claimId);
}

window.joinBattleTeam = joinBattleTeam;
window.leaveBattleTeam = leaveBattleTeam;
