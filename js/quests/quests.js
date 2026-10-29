// ==============================================================================
// Quest-Forge: Player Quest Tab (#tab-adventure)
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. Quest Discipline Definitions & Helpers
// ------------------------------------------------------------------------------
const QUEST_DISCIPLINES = [
  { name: 'Service', icon: '🌹' },
  { name: 'Bardic', icon: '🎵' },
  { name: 'Roleplay', icon: '🎭' },
  { name: 'Exploration', icon: '🌿' },
  { name: 'Crafting', icon: '🛠' },
  { name: 'Arts & Sciences', icon: '🎨' },
  { name: 'Knowledge', icon: '📚' },
  { name: 'Challenge', icon: '🏆' },
  { name: 'Trial', icon: '🏅' }
];

const DISCIPLINE_ICONS = {
  'Service': '🌹',
  'Bardic': '🎵',
  'Roleplay': '🎭',
  'Exploration': '🌿',
  'Crafting': '🛠',
  'Arts & Sciences': '🎨',
  'Knowledge': '📚',
  'Challenge': '🏆',
  'Trial': '🏅'
};

const DISCIPLINE_ORDER = [
  'Service',
  'Bardic',
  'Roleplay',
  'Exploration',
  'Crafting',
  'Arts & Sciences',
  'Knowledge',
  'Challenge',
  'Trial'
];

function getQuestDiscipline(q) {
  let disc = q?.discipline;
  if (!disc) {
    const textToCheck = `${q?.scenario_card || ''} ${q?.description || ''}`;
    const match = textToCheck.match(/<!--\s*RULES:\s*(\{.*?\})\s*-->/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.discipline) disc = parsed.discipline;
      } catch (e) {}
    }
  }
  if (!disc) return 'Service';
  const clean = disc.replace(/^[^\w\s&]+/, '').trim();
  return clean || 'Service';
}

function getQuestDisciplineIcon(disc) {
  return DISCIPLINE_ICONS[disc] || '📜';
}

function getQuestDisplayTitle(q) {
  const disc = getQuestDiscipline(q);
  const icon = getQuestDisciplineIcon(disc);
  let title = (q?.title || 'Untitled Quest').trim();
  if (title.startsWith(icon)) {
    return title;
  }
  return `${icon} ${title}`;
}

// ------------------------------------------------------------------------------
// 2. Player Quest Tab (#tab-adventure): Slot State, Quest Board, & Actions
// ------------------------------------------------------------------------------

async function fetchUserSlotState() {
  if (!currentUser) return;

  const { data: userQuests } = await supabaseClient
    .from('user_quests')
    .select('*, quests(*)')
    .eq('user_id', currentUser.id)
    .eq('status', 'accepted');

  const { data: queueMemberships } = await supabaseClient
    .from('queue_members')
    .select('*, quest_queues(*, quests(*))')
    .eq('user_id', currentUser.id);

  const { data: monsterClaims } = await supabaseClient
    .from('encounter_monsters')
    .select('*, quest_queues(*, quests(*))')
    .eq('user_id', currentUser.id)
    .eq('status', 'claimed');

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId;
  const normActivePark = typeof normalizeParkName === 'function' ? normalizeParkName(activePark) : (activePark || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
  const myUserId = currentUser?.id;

  activeMonsterClaim = (monsterClaims && monsterClaims.length > 0) 
    ? (monsterClaims.find(mc => {
        const q = mc.quest_queues?.quests;
        if (!q) return false;
        const normQPark = typeof normalizeParkName === 'function' ? normalizeParkName(q.park) : (q.park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
        const parkMatches = !normQPark || !normActivePark || (normQPark === normActivePark);
        const isMyQuest = Boolean(myUserId && q.qm_id === myUserId);
        const qmMatches = !q.qm_id || !activeQMId || (q.qm_id === activeQMId) || isMyQuest;
        return parkMatches && qmMatches;
      }) || null)
    : null;

  // Auto-cleanup any orphan user_quests for quests that have been closed or deactivated by QM
  const orphanQuestIds = userQuests?.filter(uq => !uq.quests || uq.quests.is_active === false).map(uq => uq.id) || [];
  if (orphanQuestIds.length > 0) {
    await supabaseClient.from('user_quests').delete().in('id', orphanQuestIds);
  }

  const activeSoloBattle = userQuests?.find(uq => {
    const q = uq.quests;
    if (!q?.is_active) return false;
    const normQPark = typeof normalizeParkName === 'function' ? normalizeParkName(q.park) : (q.park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
    const parkMatches = !normQPark || !normActivePark || (normQPark === normActivePark);
    const isMyQuest = Boolean(myUserId && q.qm_id === myUserId);
    const qmMatches = !q.qm_id || !activeQMId || (q.qm_id === activeQMId) || isMyQuest;
    return parkMatches && qmMatches && (q.category === 'Battle' || q.category === 'Combat');
  });

  const activeGroupBattle = queueMemberships?.find(qm => {
    const queue = qm.quest_queues;
    const quest = queue?.quests;
    if (!quest?.is_active || queue?.status === 'completed') return false;
    const normQPark = typeof normalizeParkName === 'function' ? normalizeParkName(quest.park) : (quest.park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
    const parkMatches = !normQPark || !normActivePark || (normQPark === normActivePark);
    const isMyQuest = Boolean(myUserId && quest.qm_id === myUserId);
    const qmMatches = !quest.qm_id || !activeQMId || (quest.qm_id === activeQMId) || isMyQuest;
    return parkMatches && qmMatches && (quest.category === 'Battle' || quest.category === 'Combat');
  });

  activeBattleQuest = activeSoloBattle || activeGroupBattle;
  activeAdventureQuest = userQuests?.find(uq => {
    const q = uq.quests;
    if (!q?.is_active) return false;
    const normQPark = typeof normalizeParkName === 'function' ? normalizeParkName(q.park) : (q.park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
    const parkMatches = !normQPark || !normActivePark || (normQPark === normActivePark);
    const isMyQuest = Boolean(myUserId && q.qm_id === myUserId);
    const qmMatches = !q.qm_id || !activeQMId || (q.qm_id === activeQMId) || isMyQuest;
    return parkMatches && qmMatches && (q.category === 'Adventure' || (q.category !== 'Battle' && q.category !== 'Combat'));
  }) || null;
  activeLarpieQuest = activeAdventureQuest; // Backward-compatible alias
}

// Fetch Public Board Quests for Battle and Quest/Adventure Tabs
async function fetchQuests() {
  const combatContainer = document.getElementById('available-combat-quests');
  const adventureContainer = document.getElementById('available-adventure-quests') || document.getElementById('available-larpie-quests');

  if (!currentUser) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId;
  const activeQMName = typeof getActiveQMUsername === 'function' ? getActiveQMUsername() : 'Default Realm';
  const normActivePark = typeof normalizeParkName === 'function' ? normalizeParkName(activePark) : (activePark || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
  const myUserId = currentUser?.id;

  const { data: userQuests } = await supabaseClient
    .from('user_quests')
    .select('*, quests(*)')
    .eq('user_id', currentUser.id);

  const { data: myQueueMemberships } = await supabaseClient
    .from('queue_members')
    .select('*, quest_queues(*, quests(*))')
    .eq('user_id', currentUser.id);

  const activeQuestIds = userQuests ? userQuests.filter(uq => uq.status === 'accepted').map(uq => uq.quest_id) : [];
  const completedQuestIds = userQuests ? userQuests.filter(uq => uq.status === 'completed').map(uq => uq.quest_id) : [];

  const activeAdventureQuests = userQuests
    ? userQuests.filter(uq => {
        if (uq.status !== 'accepted' || !uq.quests) return false;
        const q = uq.quests;
        const normQPark = typeof normalizeParkName === 'function' ? normalizeParkName(q.park) : (q.park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
        const parkMatches = !normQPark || !normActivePark || (normQPark === normActivePark);
        const isMyQuest = Boolean(myUserId && q.qm_id === myUserId);
        const qmMatches = !q.qm_id || !activeQMId || (q.qm_id === activeQMId) || isMyQuest;
        return parkMatches && qmMatches && (q.category === 'Adventure' || (q.category !== 'Battle' && q.category !== 'Combat'));
      })
    : [];

  const { data: allQuests } = await supabaseClient
    .from('quests')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Filter available quests strictly by the player's active park AND active QM reign
  const parkQuests = (allQuests || []).filter(q => {
    const normQPark = typeof normalizeParkName === 'function' ? normalizeParkName(q.park) : (q.park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
    const parkMatches = !normQPark || !normActivePark || (normQPark === normActivePark);
    const isMyQuest = Boolean(myUserId && q.qm_id === myUserId);
    const qmMatches = !q.qm_id || !activeQMId || (q.qm_id === activeQMId) || isMyQuest;
    return parkMatches && qmMatches;
  });

  if (!parkQuests || parkQuests.length === 0) {
    if (combatContainer) combatContainer.innerHTML = `<p class="empty-state">No Active Battle in ${activePark} (${activeQMName}).</p>`;
    if (adventureContainer) {
      const activeAdvHtml = activeAdventureQuests.map(uq => renderActiveAdventureQuestCard(uq)).join('');
      adventureContainer.innerHTML = activeAdvHtml.length > 0 ? activeAdvHtml : `<p class="empty-state">No Active Quests in ${activePark} (${activeQMName}).</p>`;
    }
    return;
  }

  const available = parkQuests.filter(q => !activeQuestIds.includes(q.id) && (q.repeatable || !completedQuestIds.includes(q.id)));

  const combatQuests = available.filter(q => q.category === 'Battle' || q.category === 'Combat');
  const adventureQuests = available.filter(q => q.category === 'Adventure' || q.category === 'Quest' || (q.category !== 'Battle' && q.category !== 'Combat'));

  // Sort adventure quests by Discipline first, then by title
  adventureQuests.sort((a, b) => {
    const discA = typeof getQuestDiscipline === 'function' ? getQuestDiscipline(a) : 'Service';
    const discB = typeof getQuestDiscipline === 'function' ? getQuestDiscipline(b) : 'Service';
    const idxA = (typeof DISCIPLINE_ORDER !== 'undefined') ? DISCIPLINE_ORDER.indexOf(discA) : -1;
    const idxB = (typeof DISCIPLINE_ORDER !== 'undefined') ? DISCIPLINE_ORDER.indexOf(discB) : -1;
    const posA = idxA !== -1 ? idxA : 999;
    const posB = idxB !== -1 ? idxB : 999;
    if (posA !== posB) return posA - posB;
    return (a.title || '').localeCompare(b.title || '');
  });

  // Delegate Battle Tab rendering to renderBattleBoard in js/battle.js
  if (typeof renderBattleBoard === 'function') {
    await renderBattleBoard(combatQuests, myQueueMemberships, activePark, activeQMName);
  }

  if (adventureContainer) {
    const adventureQuestIds = adventureQuests.map(q => q.id);
    const questUsageMap = new Map();

    if (adventureQuestIds.length > 0) {
      const { data: usageData } = await supabaseClient
        .from('user_quests')
        .select('quest_id, status')
        .in('quest_id', adventureQuestIds)
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

    activeAdventureQuests.sort((a, b) => {
      const discA = typeof getQuestDiscipline === 'function' ? getQuestDiscipline(a.quests) : 'Service';
      const discB = typeof getQuestDiscipline === 'function' ? getQuestDiscipline(b.quests) : 'Service';
      const idxA = (typeof DISCIPLINE_ORDER !== 'undefined') ? DISCIPLINE_ORDER.indexOf(discA) : -1;
      const idxB = (typeof DISCIPLINE_ORDER !== 'undefined') ? DISCIPLINE_ORDER.indexOf(discB) : -1;
      const posA = idxA !== -1 ? idxA : 999;
      const posB = idxB !== -1 ? idxB : 999;
      if (posA !== posB) return posA - posB;
      return (a.quests?.title || '').localeCompare(b.quests?.title || '');
    });

    const activeAdvHtml = activeAdventureQuests.map(uq => renderActiveAdventureQuestCard(uq)).join('');
    const availAdvHtml = adventureQuests.map(q => renderAvailableQuestCard(q, 'adventure', null, null, questUsageMap.get(q.id))).join('');
    const totalAdvHtml = activeAdvHtml + availAdvHtml;

    adventureContainer.innerHTML = totalAdvHtml.length > 0
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
  const displayTitle = typeof getQuestDisplayTitle === 'function' ? getQuestDisplayTitle(q) : (q.title || 'Quest');
  const discName = typeof getQuestDiscipline === 'function' ? getQuestDiscipline(q) : 'Service';
  const discIcon = typeof getQuestDisciplineIcon === 'function' ? getQuestDisciplineIcon(discName) : '🌹';

  return `
    <details class="quest-accordion quest-joined" open>
      <summary>
        <span class="quest-summary-title">${displayTitle}</span>
      </summary>
      <div class="quest-accordion-content">
        <div class="quest-details-body">
          <div class="quest-details-panel">
            <div class="tag-container" style="margin-bottom:8px;">
              <span class="badge badge-discipline">${discIcon} ${discName}</span>
              <span class="badge badge-type">🪙 +${rewardGold} Gold</span>
              <span class="badge badge-type" style="color:#c084fc; border-color:rgba(192,132,252,0.4);">
                ${isQMVerified ? '👑 QM Verified' : '🤝 Self-Report'}
              </span>
              ${q.repeatable ? '<span class="badge badge-quest">🔁 Repeatable</span>' : ''}
            </div>
            ${q.requirements ? `<p style="color:var(--warning); font-size:12px; margin-bottom:4px;"><strong>Req:</strong> ${q.requirements}</p>` : ''}
            <p>${q.description || ''}</p>
            <div class="quest-actions-footer" style="display:flex; justify-content:flex-end; align-items:center; gap:8px; margin-top:12px;">
              <button class="btn-leave" style="min-height:32px; padding:6px 16px; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer;" onclick="abandonQuest('${uq.id}')">Abandon</button>
              ${!isQMVerified ? `<button class="btn-complete" style="min-height:32px; padding:6px 16px; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer;" onclick="completeQuest('${uq.id}', ${rewardGold})">Complete</button>` : ''}
            </div>
          </div>
        </div>
      </div>
    </details>
  `;
}

function renderAvailableQuestCard(q, type, joinedQueueId = null, queueRoster = null, questUsage = null, isCardOpen = false) {
  const isCombat = type === 'combat';
  const isAdventure = type === 'adventure' || type === 'larpie';
  const isSlotLocked = isCombat ? (!!activeBattleQuest || !!activeMonsterClaim) : (!!activeAdventureQuest || !!activeLarpieQuest);

  if (isCombat) {
    if (typeof renderBattleQuestCard === 'function') {
      return renderBattleQuestCard(q, joinedQueueId, queueRoster, isCardOpen);
    }
    return '';
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
    const displayTitle = typeof getQuestDisplayTitle === 'function' ? getQuestDisplayTitle(q) : (q.title || 'Quest');
    const discName = typeof getQuestDiscipline === 'function' ? getQuestDiscipline(q) : 'Service';
    const discIcon = typeof getQuestDisciplineIcon === 'function' ? getQuestDisciplineIcon(discName) : '🌹';

    let acceptButton = '';
    if (isExhausted) {
      acceptButton = `<button class="btn-secondary" disabled style="min-height:32px; padding:6px 16px; font-size:12px; font-weight:700; border-radius:6px; opacity:0.6;">Bounty Claimed</button>`;
    } else if (isFull) {
      acceptButton = `<button class="btn-secondary" disabled style="min-height:32px; padding:6px 16px; font-size:12px; font-weight:700; border-radius:6px; opacity:0.6;">Quest Full (${activeCount}/${maxActive})</button>`;
    } else if (isSlotLocked) {
      acceptButton = `<button class="btn-secondary" disabled style="min-height:32px; padding:6px 16px; font-size:12px; font-weight:700; border-radius:6px; opacity:0.6;">Quest Slot Full</button>`;
    } else {
      acceptButton = `<button class="btn-join" style="background:var(--quest); color:white; min-height:32px; padding:6px 16px; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer;" onclick="acceptQuest('${q.id}')">Accept</button>`;
    }

    return `
      <details class="quest-accordion">
        <summary>
          <span class="quest-summary-title">${displayTitle}</span>
        </summary>
        <div class="quest-accordion-content">
          <div class="quest-details-body">
            <div class="quest-details-panel">
              <div class="tag-container" style="margin-bottom:8px;">
                <span class="badge badge-discipline">${discIcon} ${discName}</span>
                <span class="badge badge-type">🪙 +${q.reward_gold} Gold</span>
                <span class="badge badge-type" style="color:#c084fc; border-color:rgba(192,132,252,0.4);">
                  ${rules.verificationMethod === 'Quest Master' ? '👑 QM Verified' : '🤝 Self-Report'}
                </span>
                ${q.repeatable ? '<span class="badge badge-quest">🔁 Repeatable</span>' : ''}
              </div>
              ${q.requirements ? `<p style="color:var(--warning); font-size:12px; margin-bottom:4px;"><strong>Req:</strong> ${q.requirements}</p>` : ''}
              <p>${q.description || ''}</p>
              <div class="quest-actions-footer" style="display:flex; justify-content:flex-end; align-items:center; margin-top:12px;">
                ${acceptButton}
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

  await supabaseClient.from('user_quests').update({ status: 'completed' }).eq('id', userQuestId);

  if (isCombat) {
    await applyCombatDurabilityDamage(currentUser.id, rules.allowedTypes);
  }

  // Roll Mystery Item Loot Drops if enabled on quest
  if (rules.rngLootDrops && typeof rollItemLootDrops === 'function') {
    await rollItemLootDrops([currentUser.id], isCombat, uq?.quests?.qm_id, uq?.quests?.park, uq?.quests?.kingdom);
  }

  initDashboard();
}

