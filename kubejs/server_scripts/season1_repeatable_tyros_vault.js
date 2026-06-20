// Season I - Repeatable Tyros Vault
// Path: kubejs/server_scripts/season1_repeatable_tyros_vault.js
// Full restart required.
// Keeps key requirement, but clears one-time reward memory before each click.

BlockEvents.rightClicked('irons_spellbooks:vault', event => {
  const b = event.block
  const pos = `${b.x} ${b.y} ${b.z}`

  event.server.runCommandSilent(`data modify block ${pos} server_data.rewarded_players set value []`)
  event.server.runCommandSilent(`data remove block ${pos} server_data.items_to_eject`)
  event.server.runCommandSilent(`data modify block ${pos} server_data.total_ejections_needed set value 0`)
  event.server.runCommandSilent(`data modify block ${pos} server_data.state_updating_resumes_at set value 0L`)
  event.server.runCommandSilent(`data merge block ${pos} {config:{loot_table:"irons_spellbooks:chests/citadel/citadel_vault",activation_range:128.0d,deactivation_range:129.0d,key_item:{id:"irons_spellbooks:decrepit_key",Count:1b}}}`)
})
