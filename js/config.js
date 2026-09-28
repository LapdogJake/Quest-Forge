// ==============================================================================
// Quest-Forge: Supabase Configuration & Game Constants
// ==============================================================================

const SUPABASE_URL = "https://evsknkezkbramsnzisvn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3f9t-xXsEqWntgPm9fz-ow_m7fMVt5b";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const INVENTORY_LIMITS = {
  'Trinket': 3,
  'Talisman': 2,
  'Legendary': 1
};

const DURABILITY_LIMITS = {
  'Trinket': 1,
  'Talisman': 10,
  'Legendary': 30
};

// Canonical Amtgard Kingdoms and Prominent Parks
const AMTGARD_KINGDOMS_AND_PARKS = {
  "Emerald Hills": [
    "Midnight Sun",
    "King's Crossing",
    "Tanglewood Forest",
    "Eagle's Crag",
    "Traitor's Gate",
    "Gryphon's Perch",
    "Nocturnis",
    "Oakheart",
    "Ironwood"
  ],
  "Celestial Kingdom": [
    "Slaughter Creek",
    "Nocturne Prime",
    "Mithril Hills",
    "Traitor's Gate",
    "Griffon's Keep",
    "Crimson Moon",
    "Bifrost",
    "Shadow Moor",
    "Amber Falls"
  ],
  "Burning Lands": [
    "Mourningwood Glen",
    "Pegasus Valley",
    "Granite Spyre",
    "Iron Mountain"
  ],
  "Iron Mountains": [
    "Mirrkwood",
    "Riverstone",
    "Iron Gate",
    "Tanglewood",
    "Mountain Gate",
    "Falcon Tor"
  ],
  "Golden Plains": [
    "Bitter Coast",
    "Hollow Earth",
    "Dark Oasis",
    "Sunblade",
    "Silver Springs"
  ],
  "Wetlands": [
    "Crimson Wood",
    "Granite Spyre",
    "Dark Horizon",
    "Crimson Lions",
    "Falcon's Rest",
    "Ash Hollow"
  ],
  "Dragonspine": [
    "Knight's Rest",
    "Stormwall",
    "Mithril Ridge",
    "Twilight Peak",
    "Shrouded Glade"
  ],
  "Neverwinter": [
    "Sea Dog Island",
    "Skywatch",
    "Castlegate",
    "Ravens Cross",
    "Phoenix Tears",
    "Olde Spillway",
    "Phoenix Ridge"
  ],
  "Blackspire": [
    "Valley of the Twin Rivers",
    "Mithril Hills",
    "Vanaheim",
    "Shroombluff",
    "Storm Haven",
    "Ironwood"
  ],
  "Rising Winds": [
    "Rune Stone",
    "Ethereal Planes",
    "Five Oaks",
    "Starmount",
    "North Haven",
    "Crimson Hawk",
    "Wyldewood"
  ],
  "Desert Winds": [
    "Desert Rose",
    "Ashen Hills",
    "Hidden Falls",
    "Silver Sage",
    "Iron Dragon"
  ],
  "Tal Dagore": [
    "Western Gate",
    "Crimson Wood",
    "Dragon's Salt",
    "Wyrmm Coast",
    "Red Falcon"
  ],
  "Polaris": [
    "Crimson Chain",
    "Falconridge",
    "Midgard",
    "Mists of the Dawn",
    "Wolfpack Haven",
    "Ravensweir"
  ],
  "Winter's Edge": [
    "Sunfire Valley",
    "Goldenvale",
    "Hawk's Point",
    "Raven's Cross",
    "Ivory Tower",
    "Emerald Coast"
  ],
  "Crystal Groves": [
    "Buffalo Plains",
    "High Spires",
    "Black RiverKeep",
    "Green Wood",
    "Riverstone"
  ],
  "Rivermoor": [
    "Ivory Tower",
    "Mists of the Dawn",
    "Phoenix Tears",
    "Forest Gate",
    "Red Cliffs"
  ],
  "Nine Blades": [
    "Twilight Peak",
    "Falcon's Ridge",
    "Storm Haven",
    "Wolvenwood"
  ],
  "Viridian Outlands": [
    "Mithril Grove",
    "Dragon's Rest",
    "Frozen North"
  ],
  "Northern Lights": [
    "Silvermoon",
    "Bitterroot",
    "Cascades",
    "Emerald Coast"
  ]
};

// Official magic item catalog seed used by the store UI
const STORE_CATALOG = [
  { id: 'magic-potion-barkskin', item_name: 'Potion of Barkskin', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-use self-cast barkskin effect.' },
  { id: 'magic-potion-refreshment', item_name: 'Potion of Refreshment', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-use self-cast confidence effect.' },
  { id: 'magic-potion-healing', item_name: 'Potion of Healing', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-use self-heal effect.' },
  { id: 'magic-potion-true-death', item_name: 'Potion of True Death', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-use self effect against raise-dead and life-essence effects.' },
  { id: 'magic-scroll-adaptive-blessing', item_name: 'Scroll of Adaptive Blessing', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-use adaptive blessing.' },
  { id: 'magic-scroll-ambulant', item_name: 'Scroll of Ambulant', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-use magic-user effect.' },
  { id: 'magic-scroll-blessing-wounds', item_name: 'Scroll of Blessing Against Wounds', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-use blessing against wounds.' },
  { id: 'magic-scroll-extension', item_name: 'Scroll of Extension', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-use magic-user duration effect.' },
  { id: 'magic-scroll-harden', item_name: 'Scroll of Harden', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-use harden effect.' },
  { id: 'magic-scroll-mend', item_name: 'Scroll of Mend', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-use mend effect.' },
  { id: 'magic-werewolf-fang', item_name: 'Werewolf Fang', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-refresh self lycanthropy use.' },
  { id: 'magic-spooky-doll', item_name: 'Spooky Doll', category: 'Trinket', base_cost: 1, duration_hours: 0, description: 'One-refresh terror effect.' },
  { id: 'magic-amulet-force', item_name: 'Amulet of Force', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'One-game force barrier.' },
  { id: 'magic-amulet-teleport', item_name: 'Amulet of Teleport', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'One-game teleport effect.' },
  { id: 'magic-amulet-tracking', item_name: 'Amulet of Tracking', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'One-game tracking effect.' },
  { id: 'magic-amulet-shadows', item_name: 'Amulet of Shadows', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'One-game shadow step effect.' },
  { id: 'magic-bracelet-anti-magic', item_name: 'Bracelet of Anti-Magic', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'One-game protection from magic.' },
  { id: 'magic-bracelet-solidity', item_name: 'Bracelet of Solidity', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'Always-on wearer immunity to insubstantial.' },
  { id: 'magic-bracelet-stoneskin', item_name: 'Bracelet of Stoneskin', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'One-game stoneskin effect.' },
  { id: 'magic-wand-healing', item_name: 'Wand of Healing', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'Two-game greater heal.' },
  { id: 'magic-wand-mending', item_name: 'Wand of Mending', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'Two-game greater mend.' },
  { id: 'magic-wand-release', item_name: 'Wand of Release', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'Two-game greater release.' },
  { id: 'magic-forge-mittens', item_name: 'Forge Mittens', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'Always-on hand-worn weapon property.' },
  { id: 'magic-accursed-blade', item_name: 'The Accursed Blade', category: 'Talisman', base_cost: 1, duration_hours: 0, description: 'Always-on carried weapon property.' },
  { id: 'magic-ankh-ran', item_name: 'Ankh of Ran', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'Always-on terror effect.' },
  { id: 'magic-andalsas-lament', item_name: 'Andalsa’s Lament', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'Helmet armor imbuement, non-enchantment.' },
  { id: 'magic-cloak-enigmas', item_name: 'Cloak of Enigmas', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'Shadow-step, teleport, and blink scaling.' },
  { id: 'magic-homestone', item_name: 'Homestone', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'Greater mend charge.' },
  { id: 'magic-michaels-hammer', item_name: 'Michael’s Hammer', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'Armor/shield destroying weapon.' },
  { id: 'magic-nuntius-staff', item_name: 'Nuntius Staff', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'Magic-user staff powers.' },
  { id: 'magic-phase-blade', item_name: 'Phase Blade', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'Phasing weapon.' },
  { id: 'magic-shield-chosen', item_name: 'Shield of the Chosen', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'Indestructible shield.' },
  { id: 'magic-sword-flame', item_name: 'Sword of Flame', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'Flame immunity and weapon effects.' },
  { id: 'magic-ring-power', item_name: 'Ring of Power', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'Resistance to first wound.' },
  { id: 'magic-horn-resurrection', item_name: 'Horn of Resurrection', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'One-refresh ally respawn effect.' },
  { id: 'magic-dagger-infinite-penetration', item_name: 'Dagger of Infinite Penetration', category: 'Legendary', base_cost: 1, duration_hours: 0, description: 'Complex thrown weapon effect.' }
];
