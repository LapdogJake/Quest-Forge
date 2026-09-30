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

// Official magic item catalog seed used by the store UI
const STORE_CATALOG = [
  // Trinkets (Durability: 1)
  { id: 'magic-werewolf-fang', item_name: 'Werewolf Fang', category: 'Trinket', base_cost: 4, description: 'One-refresh self lycanthropy use.' },
  { id: 'magic-potion-barkskin', item_name: 'Potion of Barkskin', category: 'Trinket', base_cost: 3, description: 'One-use self-cast barkskin effect.' },
  { id: 'magic-potion-refreshment', item_name: 'Potion of Refreshment', category: 'Trinket', base_cost: 3, description: 'One-use self-cast confidence effect.' },
  { id: 'magic-scroll-harden', item_name: 'Scroll of Harden', category: 'Trinket', base_cost: 3, description: 'One-use harden effect.' },
  { id: 'magic-scroll-ambulant', item_name: 'Scroll of Ambulant', category: 'Trinket', base_cost: 3, description: 'One-use magic-user effect.' },
  { id: 'magic-scroll-extension', item_name: 'Scroll of Extension', category: 'Trinket', base_cost: 3, description: 'One-use magic-user duration effect.' },
  { id: 'magic-scroll-adaptive-blessing', item_name: 'Scroll of Adaptive Blessing', category: 'Trinket', base_cost: 2, description: 'One-use adaptive blessing.' },
  { id: 'magic-scroll-blessing-wounds', item_name: 'Scroll of Blessing Against Wounds', category: 'Trinket', base_cost: 2, description: 'One-use blessing against wounds.' },
  { id: 'magic-scroll-mend', item_name: 'Scroll of Mend', category: 'Trinket', base_cost: 2, description: 'One-use mend effect.' },
  { id: 'magic-potion-healing', item_name: 'Potion of Healing', category: 'Trinket', base_cost: 1, description: 'One-use self-heal effect.' },
  { id: 'magic-potion-true-death', item_name: 'Potion of True Death', category: 'Trinket', base_cost: 1, description: 'One-use self effect against raise-dead and life-essence effects.' },
  { id: 'magic-spooky-doll', item_name: 'Spooky Doll', category: 'Trinket', base_cost: 2, description: 'One-refresh terror effect.' },

  // Talismans (Durability: 5)
  { id: 'magic-accursed-blade', item_name: 'The Accursed Blade', category: 'Talismans', base_cost: 74, description: 'Always-on carried weapon property.' },
  { id: 'magic-bracelet-stoneskin', item_name: 'Bracelet of Stoneskin', category: 'Talismans', base_cost: 16, description: 'One-game stoneskin effect.' },
  { id: 'magic-bracelet-anti-magic', item_name: 'Bracelet of Anti-Magic', category: 'Talismans', base_cost: 16, description: 'One-game protection from magic.' },
  { id: 'magic-wand-mending', item_name: 'Wand of Mending', category: 'Talismans', base_cost: 16, description: 'Two-game greater mend.' },
  { id: 'magic-wand-release', item_name: 'Wand of Release', category: 'Talismans', base_cost: 14, description: 'Two-game greater release.' },
  { id: 'magic-amulet-tracking', item_name: 'Amulet of Tracking', category: 'Talismans', base_cost: 12, description: 'One-game tracking effect.' },
  { id: 'magic-amulet-shadows', item_name: 'Amulet of Shadows', category: 'Talismans', base_cost: 12, description: 'One-game shadow step effect.' },
  { id: 'magic-amulet-teleport', item_name: 'Amulet of Teleport', category: 'Talismans', base_cost: 10, description: 'One-game teleport effect.' },
  { id: 'magic-wand-healing', item_name: 'Wand of Healing', category: 'Talismans', base_cost: 10, description: 'Two-game greater heal.' },
  { id: 'magic-amulet-force', item_name: 'Amulet of Force', category: 'Talismans', base_cost: 8, description: 'One-game force barrier.' },
  { id: 'magic-bracelet-solidity', item_name: 'Bracelet of Solidity', category: 'Talismans', base_cost: 6, description: 'Always-on wearer immunity to insubstantial.' },
  { id: 'magic-forge-mittens', item_name: 'Forge Mittens', category: 'Talismans', base_cost: 12, description: 'Always-on hand-worn weapon property.' },

  // Artifacts (Durability: 20)
  { id: 'magic-michaels-hammer', item_name: "Michael's Hammer", category: 'Artifacts', base_cost: 400, description: 'Armor/shield destroying weapon.' },
  { id: 'magic-phase-blade', item_name: 'Phase Blade', category: 'Artifacts', base_cost: 360, description: 'Phasing weapon.' },
  { id: 'magic-shield-chosen', item_name: 'Shield of the Chosen', category: 'Artifacts', base_cost: 280, description: 'Indestructible shield.' },
  { id: 'magic-sword-flame', item_name: 'Sword of Flame', category: 'Artifacts', base_cost: 240, description: 'Flame immunity and weapon effects.' },
  { id: 'magic-dagger-infinite-penetration', item_name: 'Dagger of Infinite Penetration', category: 'Artifacts', base_cost: 200, description: 'Complex thrown weapon effect.' },
  { id: 'magic-andalsas-lament', item_name: "Andalsa's Lament", category: 'Artifacts', base_cost: 200, description: 'Helmet armor imbuement, non-enchantment.' },
  { id: 'magic-homestone', item_name: 'Homestone', category: 'Artifacts', base_cost: 180, description: 'Greater mend charge.' },
  { id: 'magic-nuntius-staff', item_name: 'Nuntius Staff', category: 'Artifacts', base_cost: 160, description: 'Magic-user staff powers.' },
  { id: 'magic-cloak-enigmas', item_name: 'Cloak of Enigmas', category: 'Artifacts', base_cost: 140, description: 'Shadow-step, teleport, and blink scaling.' },
  { id: 'magic-ankh-ran', item_name: 'Ankh of Ran', category: 'Artifacts', base_cost: 120, description: 'Always-on terror effect.' },
  { id: 'magic-ring-power', item_name: 'Ring of Power', category: 'Artifacts', base_cost: 120, description: 'Resistance to first wound.' },
  { id: 'magic-horn-resurrection', item_name: 'Horn of Resurrection', category: 'Artifacts', base_cost: 100, description: 'One-refresh ally respawn effect.' }
];
