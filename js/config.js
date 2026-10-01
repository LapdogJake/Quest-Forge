// ==============================================================================
// Quest-Forge: Supabase Configuration & Game Constants
// ==============================================================================

const SUPABASE_URL = "https://evsknkezkbramsnzisvn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3f9t-xXsEqWntgPm9fz-ow_m7fMVt5b";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const INVENTORY_LIMITS = {
  'Trinket': 3,
  'Trinkets': 3,
  'Talisman': 2,
  'Talismans': 2,
  'Artifact': 1,
  'Artifacts': 1,
  'Legendary': 1
};

// Storage limits for Pouch and Bank loadouts
const STORAGE_LIMITS = {
  pouch: {
    'Trinket': 3,
    'Trinkets': 3,
    'Talisman': 2,
    'Talismans': 2,
    'Artifact': 1,
    'Artifacts': 1,
    'Legendary': 1
  },
  bank: {
    'Trinket': 3,
    'Trinkets': 3,
    'Talisman': 2,
    'Talismans': 2,
    'Artifact': 1,
    'Artifacts': 1,
    'Legendary': 1
  }
};

// RNG Mystery Loot Drop Rates (per encounter resolution)
const RNG_LOOT_DROP_RATES = {
  trinket: {
    rolls: 3,
    chance: 0.25 // 25% drop rate per roll
  },
  talisman: {
    rolls: 2,
    chance: 0.05 // 5% drop rate per roll
  },
  artifact: {
    rolls: 1,
    chance: 1 / 250 // 1 in 250 (0.4%)
  }
};

const DURABILITY_LIMITS = {
  'Trinket': 1,
  'Trinkets': 1,
  'Talisman': 5,
  'Talismans': 5,
  'Artifact': 20,
  'Artifacts': 20,
  'Legendary': 20
};

// Amtgard Kingdoms and Parks (Beta Testing: The Freeholds of Amtgard & Beta - Test)
const AMTGARD_KINGDOMS_AND_PARKS = {
  "The Freeholds of Amtgard": [
    "Delver's Rest"
  ],
  "Beta - Test": [
    "Beta - Test"
  ]
};

// Amtgard Rulebook of Play (ROP) Quest Abilities
const AMTGARD_ROP_QUEST_ABILITIES = [
  "Affinity for Nature",
  "Calm",
  "Charm",
  "Court Knowledge",
  "Disarm Traps",
  "Hallowed Ground",
  "Magical Knowledge",
  "Menace",
  "Persuasion",
  "Pick Locks",
  "Presence",
  "Talk to Dead",
  "Tracker",
  "Tribal Knowledge",
  "Turn Undead",
  "Prepared"
];

const AMTGARD_ROP_QUEST_ABILITY_DETAILS = {
  "Affinity for Nature": "Player is in tune with nature, and the beings who live in harmony with nature. Considered a friend by such monsters and NPCs. Has knowledge about animals and natural locations.",
  "Calm": "Player gives off an aura of calm. Has an advantage when negotiating or dealing with non-hostile monsters and NPCs.",
  "Charm": "Player can initiate a performance that entrances a monster or NPC. The monster will not attack anybody for the duration (song/dance/joke/story, max 2 min). 1/Game.",
  "Court Knowledge": "Player is familiar with royal court customs. Has an advantage when dealing with politicians and nobles.",
  "Disarm Traps": "Player has an affinity for mechanical traps. If they fail an attempt to disarm a trap, they fare better than other players.",
  "Hallowed Ground": "Player creates a fixed 20' radius area where no offensive actions can occur for 2 minutes. 1/Game.",
  "Magical Knowledge": "Player can detect and identify magical locks and traps, and has background information about magical beings and locations.",
  "Menace": "Player gives off an aura of menace sensed by hostile monsters; has an advantage when attempting to intimidate hostile monsters.",
  "Persuasion": "Intelligent monsters and NPCs find the player's arguments more convincing and are more likely to be influenced.",
  "Pick Locks": "Player has an affinity for mechanical locks. If they fail an attempt to pick a lock, they fare better than other players.",
  "Presence": "Player may converse safely with players, monsters, or NPCs so long as no hostile action is taken (max 3 min). 1/Game.",
  "Talk to Dead": "Dead players, intelligent monsters, and intelligent NPCs can be asked one yes/no question and must answer truthfully. 1/target.",
  "Tracker": "Player is an experienced tracker; able to determine more info about monsters/NPCs in the area and possible objective locations.",
  "Tribal Knowledge": "Player is familiar with tribal and clan customs. Edge in understanding and negotiating with tribal/clan monsters and NPCs.",
  "Turn Undead": "Monster and NPC undead must stay 50' away and may not initiate hostile actions for 2 minutes. 1/Game.",
  "Prepared": "Player is an experienced campaigner. The reeve privately gives the player a brief overview of monsters and challenges likely to be encountered."
};

// Official magic item catalog seed used by the store UI with explicit per-item unique durability
const STORE_CATALOG = [
  // Trinkets (Durability: 1)
  { id: 'magic-werewolf-fang', item_name: 'Werewolf Fang', category: 'Trinket', durability_max: 1, base_cost: 4, description: 'One-refresh self lycanthropy use.' },
  { id: 'magic-potion-barkskin', item_name: 'Potion of Barkskin', category: 'Trinket', durability_max: 1, base_cost: 3, description: 'One-use self-cast barkskin effect.' },
  { id: 'magic-potion-refreshment', item_name: 'Potion of Refreshment', category: 'Trinket', durability_max: 1, base_cost: 3, description: 'One-use self-cast confidence effect.' },
  { id: 'magic-scroll-harden', item_name: 'Scroll of Harden', category: 'Trinket', durability_max: 1, base_cost: 3, description: 'One-use harden effect.' },
  { id: 'magic-scroll-ambulant', item_name: 'Scroll of Ambulant', category: 'Trinket', durability_max: 1, base_cost: 3, description: 'One-use magic-user effect.' },
  { id: 'magic-scroll-extension', item_name: 'Scroll of Extension', category: 'Trinket', durability_max: 1, base_cost: 3, description: 'One-use magic-user duration effect.' },
  { id: 'magic-scroll-adaptive-blessing', item_name: 'Scroll of Adaptive Blessing', category: 'Trinket', durability_max: 1, base_cost: 2, description: 'One-use adaptive blessing.' },
  { id: 'magic-scroll-blessing-wounds', item_name: 'Scroll of Blessing Against Wounds', category: 'Trinket', durability_max: 1, base_cost: 2, description: 'One-use blessing against wounds.' },
  { id: 'magic-scroll-mend', item_name: 'Scroll of Mend', category: 'Trinket', durability_max: 1, base_cost: 2, description: 'One-use mend effect.' },
  { id: 'magic-potion-healing', item_name: 'Potion of Healing', category: 'Trinket', durability_max: 1, base_cost: 1, description: 'One-use self-heal effect.' },
  { id: 'magic-potion-true-death', item_name: 'Potion of True Death', category: 'Trinket', durability_max: 1, base_cost: 1, description: 'One-use self effect against raise-dead and life-essence effects.' },
  { id: 'magic-spooky-doll', item_name: 'Spooky Doll', category: 'Trinket', durability_max: 1, base_cost: 2, description: 'One-refresh terror effect.' },

  // Talismans (Durability: 5)
  { id: 'magic-accursed-blade', item_name: 'The Accursed Blade', category: 'Talismans', durability_max: 5, base_cost: 74, description: 'Always-on carried weapon property.' },
  { id: 'magic-bracelet-stoneskin', item_name: 'Bracelet of Stoneskin', category: 'Talismans', durability_max: 5, base_cost: 16, description: 'One-game stoneskin effect.' },
  { id: 'magic-bracelet-anti-magic', item_name: 'Bracelet of Anti-Magic', category: 'Talismans', durability_max: 5, base_cost: 16, description: 'One-game protection from magic.' },
  { id: 'magic-wand-mending', item_name: 'Wand of Mending', category: 'Talismans', durability_max: 5, base_cost: 16, description: 'Two-game greater mend.' },
  { id: 'magic-wand-release', item_name: 'Wand of Release', category: 'Talismans', durability_max: 5, base_cost: 14, description: 'Two-game greater release.' },
  { id: 'magic-amulet-tracking', item_name: 'Amulet of Tracking', category: 'Talismans', durability_max: 5, base_cost: 12, description: 'One-game tracking effect.' },
  { id: 'magic-amulet-shadows', item_name: 'Amulet of Shadows', category: 'Talismans', durability_max: 5, base_cost: 12, description: 'One-game shadow step effect.' },
  { id: 'magic-amulet-teleport', item_name: 'Amulet of Teleport', category: 'Talismans', durability_max: 5, base_cost: 10, description: 'One-game teleport effect.' },
  { id: 'magic-wand-healing', item_name: 'Wand of Healing', category: 'Talismans', durability_max: 5, base_cost: 10, description: 'Two-game greater heal.' },
  { id: 'magic-amulet-force', item_name: 'Amulet of Force', category: 'Talismans', durability_max: 5, base_cost: 8, description: 'One-game force barrier.' },
  { id: 'magic-bracelet-solidity', item_name: 'Bracelet of Solidity', category: 'Talismans', durability_max: 5, base_cost: 6, description: 'Always-on wearer immunity to insubstantial.' },
  { id: 'magic-forge-mittens', item_name: 'Forge Mittens', category: 'Talismans', durability_max: 5, base_cost: 12, description: 'Always-on hand-worn weapon property.' },

  // Artifacts (Durability: 20)
  { id: 'magic-michaels-hammer', item_name: "Michael's Hammer", category: 'Artifacts', durability_max: 20, base_cost: 400, description: 'Armor/shield destroying weapon.' },
  { id: 'magic-phase-blade', item_name: 'Phase Blade', category: 'Artifacts', durability_max: 20, base_cost: 360, description: 'Phasing weapon.' },
  { id: 'magic-shield-chosen', item_name: 'Shield of the Chosen', category: 'Artifacts', durability_max: 20, base_cost: 280, description: 'Indestructible shield.' },
  { id: 'magic-sword-flame', item_name: 'Sword of Flame', category: 'Artifacts', durability_max: 20, base_cost: 240, description: 'Flame immunity and weapon effects.' },
  { id: 'magic-dagger-infinite-penetration', item_name: 'Dagger of Infinite Penetration', category: 'Artifacts', durability_max: 20, base_cost: 200, description: 'Complex thrown weapon effect.' },
  { id: 'magic-andalsas-lament', item_name: "Andalsa's Lament", category: 'Artifacts', durability_max: 20, base_cost: 200, description: 'Helmet armor imbuement, non-enchantment.' },
  { id: 'magic-homestone', item_name: 'Homestone', category: 'Artifacts', durability_max: 20, base_cost: 180, description: 'Greater mend charge.' },
  { id: 'magic-nuntius-staff', item_name: 'Nuntius Staff', category: 'Artifacts', durability_max: 20, base_cost: 160, description: 'Magic-user staff powers.' },
  { id: 'magic-cloak-enigmas', item_name: 'Cloak of Enigmas', category: 'Artifacts', durability_max: 20, base_cost: 140, description: 'Shadow-step, teleport, and blink scaling.' },
  { id: 'magic-ankh-ran', item_name: 'Ankh of Ran', category: 'Artifacts', durability_max: 20, base_cost: 120, description: 'Always-on terror effect.' },
  { id: 'magic-ring-power', item_name: 'Ring of Power', category: 'Artifacts', durability_max: 20, base_cost: 120, description: 'Resistance to first wound.' },
  { id: 'magic-horn-resurrection', item_name: 'Horn of Resurrection', category: 'Artifacts', durability_max: 20, base_cost: 100, description: 'One-refresh ally respawn effect.' }
];
