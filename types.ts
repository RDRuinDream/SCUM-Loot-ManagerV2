
export interface ScumItem {
  Id?: string;
  Name?: string;
  Rarity?: string;
  QuantityMin?: number;
  QuantityMax?: number;
  [key: string]: any;
}

export interface ScumSubpreset {
  Id?: string;
  Name?: string;
  Rarity?: string;
  [key: string]: any;
}

export interface ScumNode {
  Rarity?: string;
  Ids?: string[];
  [key: string]: any;
}

export interface ScumZoneRect {
  TopLeft: string; // Format: "X=-402207.4219 Y=-658042.9789"
  BottomRight: string;
  Name?: string;
  // Metadata for visualizer
  sourceType?: 'standard' | 'modifier';
  sourcePath?: string;
  parentIndex?: number; // Index in file or array
  modifiers?: Record<string, number>; // Attributes if from GeneralZoneModifiers
}

export interface ScumZoneModifierRect {
    TopLeft?: string;
    BottomRight?: string;
    Name?: string;
    Sector?: string;
}

export interface ZoneModifier {
    Zones?: ScumZoneModifierRect[];
    SpawnerProbabilityMultiplier?: number;
    ExamineSpawnerProbabilityMultiplier?: number;
    ExamineSpawnerQuantityMultiplier?: number;
    [key: string]: any; // Allow other multipliers
}

export interface GeneralZoneModifiersJson {
    Modifiers: ZoneModifier[];
}

export interface ItemSpawningParameter {
    Id: string;
    IsDisabledForSpawning: boolean;
    AllowedLocations: string[]; // "Coastal", "Continental", "Mountain"
    CooldownPerSquadMemberMin: number;
    CooldownPerSquadMemberMax: number;
    CooldownGroup: string;
    Variations: string[];
    ShouldOverrideInitialAndRandomUsage: boolean;
    InitialUsageOverride: number;
    RandomUsageOverrideUsage: number;
    [key: string]: any;
}

export interface ItemSpawningParametersJson {
    Parameters: ItemSpawningParameter[];
}

export interface ScumZoneJson {
  Zones: ScumZoneRect[];
}

export interface ScumJson {
  Items?: ScumItem[];
  Subpresets?: ScumSubpreset[];
  Nodes?: ScumNode[];
  FixedItems?: (string | { Id: string, Quantity: number })[];
  Zones?: ScumZoneRect[];
  Modifiers?: ZoneModifier[]; 
  Parameters?: ItemSpawningParameter[]; // Added for ItemSpawningParameters support
  Probability?: number;
  QuantityMin?: number;
  QuantityMax?: number;
  AllowDuplicates?: boolean;
  ShouldFilterItemsByZone?: boolean;
  ShouldApplyLocationSpecificProbabilityModifier?: boolean;
  ShouldApplyLocationSpecificDamageModifier?: boolean;
  InitialDamage?: number;
  RandomDamage?: number;
  InitialUsage?: number;
  RandomUsage?: number;
  PostSpawnActions?: string[];
  [key: string]: any;
}

export interface FileNode {
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  path: string;
  children?: FileNode[];
}

export enum Rarity {
  Abundant = "Abundant",
  Common = "Common",
  Uncommon = "Uncommon",
  Rare = "Rare",
  VeryRare = "VeryRare",
  ExtremelyRare = "ExtremelyRare"
}

export const RARITY_WEIGHTS: Record<string, number> = {
  "Abundant": 32,
  "Common": 16,
  "Uncommon": 8,
  "Rare": 4,
  "VeryRare": 2,
  "ExtremelyRare": 1
};

export const POST_SPAWN_ACTIONS: Record<string, string> = {
  "AbandonedBunkerKeycard": "If the item is a keycard, assign that it can open the closest bunker.",
  "KillboxKeycard_Cargo": "If the item is a keycard, assign 72 hours duration to it. It drops regardless of server setting limit, but adds to the maximum limit itself.",
  "KillboxKeycard_Sentry": "If the item is a keycard, assign 48 hours duration to it. It drops regardless of server setting limit, but adds to the maximum limit itself.",
  "KillboxKeycard_Police": "If the items is a keycard, assign 24 hours duration to it. It is limited by server settings for police station keycards and adds to the maximum limit.",
  "KillboxKeycard_Radiation": "If the items is a keycard, assign 24 hours duration to it. It is limited by server settings for radiated police station keycards, adds to the maximum limit.",
  "SetAmmoAmount_BigStash": "If the item is ammo, sets the ammo count to 50-100% capacity of the caliber.",
  "SetAmmoAmount_SmallStash": "If the item is ammo, sets the ammo count to 0-35% capacity of the caliber.",
  "SetCashAmount_BigStash": "If the item is Cash, sets it's value to 200-500.",
  "SetCashAmount_MediumStash": "If the item is Cash, sets it's value to 50-200.",
  "SetCashAmount_SmallStash": "If the item is Cash, sets it's value to 1-100.",
  "SetClothesDirtiness_DeadPuppets": "If the item is clothes, sets the dirtiness to 93-96%.",
  "SetClothesDirtiness_DirtyClothes": "If the item is clothes, sets the dirtiness to 60-85%.",
  "SetClothesDirtiness_ResidentialClothes": "If the item is clothes, sets the dirtiness to 0-20%.",
  "SetUsage_Max": "All items with uses will spawn with 0 uses (e.g., empty bottle).",
  "SetResourceAmount_CargoDropGasolineCanister": "Ignores the InitialUsageOverride from Parameters.json, only used in cargo drop spawner presets."
};
