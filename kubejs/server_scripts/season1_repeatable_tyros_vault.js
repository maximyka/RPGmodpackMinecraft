// Season I - Repeatable Tyros Vault v2 (1.0.10 hotfix)
// Path: kubejs/server_scripts/season1_repeatable_tyros_vault.js
// Full server restart required.
//
// Root cause fixed:
// The old script cleared server_data.items_to_eject and total_ejections_needed on every right-click.
// If KubeJS ran after Iron's Vault accepted the key, the key could be consumed and the queued loot erased.
//
// New rule:
// - keep the built-in Iron's Vault key/loot/ejection pipeline intact;
// - only clear rewarded_players, so the same player can use another key later;
// - never touch items_to_eject, total_ejections_needed or state_updating_resumes_at during normal clicks.

const SEASON1_TYROS_VAULT_LOOT = 'irons_spellbooks:chests/citadel/citadel_vault'
const SEASON1_TYROS_VAULT_KEY = 'irons_spellbooks:decrepit_key'

function season1VaultPos(block) {
  return `${block.x} ${block.y} ${block.z}`
}

function season1PrepareRepeatableVault(server, pos) {
  // Keep config fresh in case an old generated vault has stale/default NBT. Safe and idempotent.
  server.runCommandSilent(`data merge block ${pos} {config:{loot_table:"${SEASON1_TYROS_VAULT_LOOT}",activation_range:128.0d,deactivation_range:129.0d,key_item:{id:"${SEASON1_TYROS_VAULT_KEY}",Count:1b}}}`)

  // This is the only normal-click reset. It removes the vanilla/ported one-reward-per-player memory.
  // Do NOT clear items_to_eject here: that is the pending reward queue.
  server.runCommandSilent(`data modify block ${pos} server_data.rewarded_players set value []`)
}

BlockEvents.rightClicked('irons_spellbooks:vault', event => {
  const pos = season1VaultPos(event.block)

  season1PrepareRepeatableVault(event.server, pos)

  // After the vault has had time to eject rewards, clear only rewarded_players again.
  // This makes the next key work without requiring manual /function reset.
  if (typeof event.server.scheduleInTicks === 'function') {
    event.server.scheduleInTicks(120, callback => {
      callback.server.runCommandSilent(`data modify block ${pos} server_data.rewarded_players set value []`)
    })
  }
})
