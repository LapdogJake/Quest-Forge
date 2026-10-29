// ==============================================================================
// Quest-Forge: Player Battle Tab (Multi-Team Queues & Battle Cards)
// ==============================================================================

async function fetchMonsterEncounters() {
  // Delegate directly to fetchQuests() which manages the live unified combat board (#available-combat-quests)
  if (typeof fetchQuests === 'function') {
    return await fetchQuests();
  }
}

function getSavedBattleTeamFallback(questId, userId) {
  if (!questId || !userId) return '';
  try {
    return localStorage.getItem(`qf_battle_team_${questId}_${userId}`) || '';
  } catch (_) {
    return '';
  }
}

function setSavedBattleTeamFallback(questId, userId, teamKey) {
  if (!questId || !userId) return;
  try {
    if (teamKey) {
      localStorage.setItem(`qf_battle_team_${questId}_${userId}`, teamKey);
    } else {
      localStorage.removeItem(`qf_battle_team_${questId}_${userId}`);
    }
  } catch (_) {}
}

// Fetch live queue rosters and render the Player Battle Tab (#available-combat-quests)
async function renderBattleBoard(combatQuests, myQueueMemberships, activePark, activeQMName) {
  const combatContainer = document.getElementById('available-combat-quests');
  if (!combatContainer) return;

  const combatQuestById = new Map();
  (combatQuests || []).forEach(q => combatQuestById.set(q.id, q));

  const joinedQueueMap = new Map();
  (myQueueMemberships || []).forEach(m => {
    const queue = m.quest_queues;
    const quest = queue?.quests;
    if (!queue || !quest || queue.status === 'completed') return;
    if (quest.category === 'Battle' || quest.category === 'Combat') {
      const questObj = combatQuestById.get(quest.id) || quest;
      const rules = typeof getQuestDurabilityRules === 'function'
        ? getQuestDurabilityRules(questObj)
        : { activeTeams: ['red', 'blue'] };
      const rawTeam = m.team || m.role_name || getSavedBattleTeamFallback(quest.id, currentUser?.id);
      const normTeam = typeof normalizeBattleMemberTeam === 'function'
        ? normalizeBattleMemberTeam(rawTeam, rules.activeTeams)
        : (rules.activeTeams[0] || 'red');
      joinedQueueMap.set(quest.id, {
        queueId: queue.id,
        teamKey: normTeam
      });
    }
  });

  // Also check activeMonsterClaim in case the player joined Blue/Yellow/Monster via encounter_monsters fallback
  if (activeMonsterClaim && activeMonsterClaim.quest_queues?.quest_id) {
    const mQuestId = activeMonsterClaim.quest_queues.quest_id;
    const questObj = combatQuestById.get(mQuestId) || activeMonsterClaim.quest_queues?.quests;
    const rules = typeof getQuestDurabilityRules === 'function'
      ? getQuestDurabilityRules(questObj)
      : { activeTeams: ['red', 'blue'] };
    const rawTeam = activeMonsterClaim.team || activeMonsterClaim.role_name || getSavedBattleTeamFallback(mQuestId, currentUser?.id) || 'monster';
    const normTeam = typeof normalizeBattleMemberTeam === 'function'
      ? normalizeBattleMemberTeam(rawTeam, rules.activeTeams)
      : 'monster';
    joinedQueueMap.set(mQuestId, {
      queueId: activeMonsterClaim.queue_id,
      teamKey: normTeam,
      monsterClaimId: activeMonsterClaim.id
    });
  }

  const combatQuestIds = (combatQuests || []).map(q => q.id);
  const queueRosterByQuest = new Map();

  if (combatQuestIds.length > 0) {
    // Do NOT use .order('created_at') on quest_queues as older schemas may not have created_at on quest_queues
    let { data: queuedBattleLines, error: queueErr } = await supabaseClient
      .from('quest_queues')
      .select('id, quest_id, status, queue_members(*, profiles(id, username, quest_abilities)), encounter_monsters(*, profiles(id, username, quest_abilities))')
      .in('quest_id', combatQuestIds)
      .in('status', ['waiting', 'active']);

    if (queueErr || !queuedBattleLines) {
      const fallbackRes = await supabaseClient
        .from('quest_queues')
        .select('id, quest_id, status, queue_members(*), encounter_monsters(*)')
        .in('quest_id', combatQuestIds)
        .in('status', ['waiting', 'active']);
      queuedBattleLines = fallbackRes.data || [];
    }

    (queuedBattleLines || []).forEach(line => {
      if (!line || !line.quest_id) return;

      const questObj = combatQuestById.get(line.quest_id);
      const rules = typeof getQuestDurabilityRules === 'function'
        ? getQuestDurabilityRules(questObj)
        : { activeTeams: ['red', 'blue'], playerTeams: ['red', 'blue'], hasMonsters: false };

      // Initialize or merge with existing entry for this quest_id (handles multiple open queue rows gracefully)
      let entry = queueRosterByQuest.get(line.quest_id);
      if (!entry) {
        const rostersByTeam = {};
        rules.activeTeams.forEach(tk => { rostersByTeam[tk] = []; });
        entry = {
          queueId: line.id,
          queueStatus: line.status,
          rostersByTeam,
          joinedTeamKey: null,
          joinedQueueId: null,
          joinedMonsterClaimId: null
        };
        queueRosterByQuest.set(line.quest_id, entry);
      } else {
        if (line.status === 'active') entry.queueStatus = 'active';
        if ((line.queue_members?.length || 0) > 0 || (line.encounter_monsters?.length || 0) > 0) {
          entry.queueId = line.id;
        }
      }

      const rostersByTeam = entry.rostersByTeam;

      // 1. Process queue_members
      (line.queue_members || []).forEach(member => {
        const uid = member.user_id || member.profiles?.id;
        const isMe = Boolean(currentUser && uid === currentUser.id);
        const rawTeam = member.team || member.role_name || (isMe ? getSavedBattleTeamFallback(line.quest_id, uid) : '');
        const teamKey = typeof normalizeBattleMemberTeam === 'function'
          ? normalizeBattleMemberTeam(rawTeam, rules.activeTeams)
          : (rules.activeTeams[0] || 'red');

        if (!rostersByTeam[teamKey]) rostersByTeam[teamKey] = [];
        const alreadyInTeam = rostersByTeam[teamKey].some(m => m.userId && m.userId === uid);
        if (!alreadyInTeam) {
          const fallbackName = isMe ? (currentProfile?.username || currentUser?.username || 'Hero') : 'Hero';
          rostersByTeam[teamKey].push({
            id: member.id,
            userId: uid,
            username: member.profiles?.username || fallbackName,
            abilities: member.profiles?.quest_abilities || (isMe ? (currentProfile?.quest_abilities || []) : []),
            sourceTable: 'queue_members',
            teamKey
          });
        }

        if (isMe) {
          entry.joinedTeamKey = teamKey;
          entry.joinedQueueId = line.id;
        }
      });

      // 2. Process encounter_monsters (supports Monster Line AND fallback team storage if queue_members lacks role_name)
      (line.encounter_monsters || []).forEach(member => {
        if (member.status === 'completed') return;
        const uid = member.user_id || member.profiles?.id;
        const isMe = Boolean(currentUser && uid === currentUser.id);
        const rawTeam = member.team || member.role_name || (isMe ? getSavedBattleTeamFallback(line.quest_id, uid) : 'monster');
        const targetTeam = typeof normalizeBattleMemberTeam === 'function'
          ? normalizeBattleMemberTeam(rawTeam, rules.activeTeams)
          : (rules.activeTeams.includes('monster') ? 'monster' : (rules.activeTeams[1] || rules.activeTeams[0] || 'monster'));

        if (!rostersByTeam[targetTeam]) rostersByTeam[targetTeam] = [];
        const alreadyListed = Object.values(rostersByTeam).some(list => list.some(m => m.userId && m.userId === uid));
        if (!alreadyListed) {
          const fallbackName = isMe ? (currentProfile?.username || currentUser?.username || 'Fighter') : 'Fighter';
          rostersByTeam[targetTeam].push({
            id: member.id,
            userId: uid,
            username: member.profiles?.username || fallbackName,
            abilities: member.profiles?.quest_abilities || (isMe ? (currentProfile?.quest_abilities || []) : []),
            sourceTable: 'encounter_monsters',
            teamKey: targetTeam
          });
        }

        if (isMe) {
          entry.joinedTeamKey = targetTeam;
          entry.joinedQueueId = line.id;
          entry.joinedMonsterClaimId = member.id;
        }
      });

      entry.heroPlayers = rostersByTeam[rules.playerTeams[0] || 'red'] || [];
      entry.monsterPlayers = rostersByTeam['monster'] || rostersByTeam[rules.playerTeams[1] || 'blue'] || [];
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
function renderBattleQuestCard(q, joinedInfo = null, queueRoster = null, isCardOpen = false) {
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

  const joinedQueueIdFromMap = typeof joinedInfo === 'object' && joinedInfo !== null ? joinedInfo.queueId : joinedInfo;
  const joinedTeamFromMap = typeof joinedInfo === 'object' && joinedInfo !== null ? joinedInfo.teamKey : null;
  const joinedMonsterIdFromMap = typeof joinedInfo === 'object' && joinedInfo !== null ? joinedInfo.monsterClaimId : null;

  const rostersByTeam = queueRoster?.rostersByTeam || {};
  const myTeamKey = queueRoster?.joinedTeamKey || joinedTeamFromMap || (joinedQueueIdFromMap ? ( getSavedBattleTeamFallback(q.id, currentUser?.id) || activeTeams[0] ) : null);
  const myQueueId = queueRoster?.joinedQueueId || joinedQueueIdFromMap || '';
  const myMonsterClaimId = queueRoster?.joinedMonsterClaimId || joinedMonsterIdFromMap || (activeMonsterClaim && activeMonsterClaim.quest_queues?.quest_id === q.id ? activeMonsterClaim.id : '');

  // Ensure that if the current user is joined to myTeamKey, their name is always visible in that team's roster list
  if (myTeamKey && currentUser) {
    if (!rostersByTeam[myTeamKey]) rostersByTeam[myTeamKey] = [];
    const meAlreadyInList = rostersByTeam[myTeamKey].some(p =>
      p.userId === currentUser.id || p.username === currentProfile?.username || p.username === currentUser.username
    );
    if (!meAlreadyInList) {
      rostersByTeam[myTeamKey].push({
        id: myMonsterClaimId || 'self',
        userId: currentUser.id,
        username: currentProfile?.username || currentUser.username || 'Hero',
        abilities: currentProfile?.quest_abilities || [],
        teamKey: myTeamKey
      });
    }
  }

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
          <button class="btn-battle-action btn-battle-leave" onclick="leaveBattleTeam('${myQueueId}', '${myMonsterClaimId}', '${q.id}')">
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

  // Build Reward & Rule Badges
  const winGold = rules.victoryGold ?? 15;
  const lossGold = rules.defeatGold ?? 10;
  const extraPlacements = Array.isArray(rules.extraPlacements) ? rules.extraPlacements : [];
  const ordSuffix = ['2nd', '3rd', '4th', '5th'];

  const middleBadgesHtml = extraPlacements.map((amt, idx) => {
    return `<span class="badge badge-type" style="color:#cbd5e1; border-color:#475569; font-weight:600;">+${amt}g ${ordSuffix[idx] || `${idx + 2}th`}</span>`;
  }).join('');

  const rewardBadgesHtml = `
    <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold); font-weight:bold;">+${winGold}g Win</span>
    ${middleBadgesHtml}
    <span class="badge badge-type" style="color:#94a3b8; border-color:#64748b;">+${lossGold}g Loss</span>
    ${rules.hasMonsters ? `<span class="badge badge-type" style="color:#fda4af; border-color:rgba(244,63,94,0.4);">👹 +${rules.monsterReward ?? 10}g Monster</span>` : ''}
  `;

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
          ${rewardBadgesHtml}
          ${rules.hasMonsters
            ? '<span class="badge badge-monster" title="Monster line does not lose gear durability">Monsters are NPCs</span>'
            : ''}
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

  // Fetch open queues for this quest without .order('created_at') so older schemas never error out
  const { data: existingQueues } = await supabaseClient
    .from('quest_queues')
    .select('*')
    .eq('quest_id', questId)
    .in('status', ['waiting', 'active']);

  const activeQueueRow = (existingQueues || []).find(q => q.status === 'active') || (existingQueues || [])[0] || null;

  if (activeQueueRow && activeQueueRow.status === 'active' && !rules.allowMidJoin) {
    alert("⚠️ This battle is currently active in combat! You cannot join or switch sides while the battle is live.");
    return;
  }

  let queueId = null;

  if (activeQueueRow) {
    queueId = activeQueueRow.id;
  } else {
    let { data: newQueue, error } = await supabaseClient
      .from('quest_queues')
      .insert({ quest_id: questId, status: 'waiting' })
      .select()
      .single();

    if (error) {
      alert("Error opening line: " + error.message);
      return;
    }
    queueId = newQueue.id;
  }

  const normalizedKey = String(teamKey || 'red').toLowerCase();
  const meta = typeof getBattleTeamMeta === 'function'
    ? getBattleTeamMeta(normalizedKey)
    : { label: normalizedKey, icon: '⚔️' };

  // Save local fallback so the client always remembers the exact team joined
  setSavedBattleTeamFallback(questId, currentUser.id, normalizedKey);

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
      // Fallback if 'role_name' also isn't present on queue_members:
      // For any non-Red team (Blue, Yellow, Green, Purple, Orange, Monster), encounter_monsters has role_name!
      if (normalizedKey !== 'red') {
        const { error: monsterErr } = await supabaseClient.from('encounter_monsters').insert({
          queue_id: queueId,
          user_id: currentUser.id,
          role_name: normalizedKey,
          status: 'claimed'
        });
        if (monsterErr) {
          // Final fallback if encounter_monsters also rejected
          const { error: err3 } = await supabaseClient
            .from('queue_members')
            .insert({ queue_id: queueId, user_id: currentUser.id });
          joinError = err3;
        }
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

async function leaveBattleTeam(queueId, monsterClaimId = '', questId = '') {
  if (questId && currentUser) {
    setSavedBattleTeamFallback(questId, currentUser.id, '');
  }

  const ops = [];
  if (queueId) {
    ops.push(supabaseClient.from('queue_members').delete().eq('queue_id', queueId).eq('user_id', currentUser.id));
    ops.push(supabaseClient.from('encounter_monsters').delete().eq('queue_id', queueId).eq('user_id', currentUser.id));
  }
  if (monsterClaimId && monsterClaimId !== 'self') {
    ops.push(supabaseClient.from('encounter_monsters').delete().eq('id', monsterClaimId));
  }
  // Also clean up across any other open queues for this questId so duplicate queues never trap the player
  if (questId && currentUser) {
    const { data: openQs } = await supabaseClient
      .from('quest_queues')
      .select('id')
      .eq('quest_id', questId)
      .in('status', ['waiting', 'active']);
    const qIds = (openQs || []).map(q => q.id).filter(Boolean);
    if (qIds.length > 0) {
      ops.push(supabaseClient.from('queue_members').delete().in('queue_id', qIds).eq('user_id', currentUser.id));
      ops.push(supabaseClient.from('encounter_monsters').delete().in('queue_id', qIds).eq('user_id', currentUser.id));
    }
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
