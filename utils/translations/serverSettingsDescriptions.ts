
export const serverSettingsDescriptions: Record<string, string> = {
    // General
    "ServerName": "您服务器在服务器浏览器列表中显示的名称。",
    "MaxPlayers": "同时允许连接的最大玩家数量。",
    "ServerPassword": "加入服务器需要输入密码。若不输入则为开放访问模式。",
    "ServerMessageOfTheDay": "玩家加入服务器时所显示的消息。",
    
    // World / Time
    "TimeOfTheDaySpeed": "Multiplier for the day/night cycle speed. Higher values mean faster days.",
    "MaxAllowedAnimalsInWorld": "Maximum total number of animals allowed in the world.",
    "MaxAllowedZombiesInWorld": "Maximum total number of puppets (zombies) allowed in the world.",
    "ZombieDamageMultiplier": "Multiplier for damage dealt by puppets to players.",
    
    // Gameplay
    "AllowSectorRespawn": "Enables players to respawn in the same sector after death (costs FP).",
    "AllowShelterRespawn": "Enables players to respawn at their built shelter (costs FP).",
    "PermadeathThreshold": "Fame Point balance threshold below which a character is permanently deleted upon death.",
    
    // Vehicles
    "FuelDrainFromEngineMultiplier": "Multiplier for how fast vehicles consume fuel.",
    "BatteryDrainFromEngineMultiplier": "Multiplier for how fast vehicle batteries drain while engine is running.",
    
    // Items
    "SpawnerProbabilityMultiplier": "Global multiplier for item spawn chances on the ground/furniture.",
    "ExamineSpawnerProbabilityMultiplier": "Global multiplier for finding items when searching containers.",
    
    // Building
    "DisableBaseBuilding": "If set to True, players cannot build any base elements.",
    "FlagOvertakeDuration": "Time in seconds required to overtake an enemy flag.",
    
    // Killbox
    "ElectricalDoorUnlockFailurePenalty": "Damage taken when failing to unlock an electrical door in a Killbox.",
    
    // Features
    "ShowCrosshair": "Enables or disables the weapon crosshair on the HUD.",
    "ShowPlayerTags": "Visibility of player name tags above their heads.",
    "AllowMapScreen": "Allows players to access the map screen (M key).",
    
    // Economy
    "TradersUnlimitedStock": "If True, traders will never run out of items to sell.",
    "TradersUnlimitedFunds": "If True, traders will always have money to buy items from players."
};
