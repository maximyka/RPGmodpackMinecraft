// kubejs/server_scripts/season1_weapon_recipe_patch.js
//
// Season I weapon recipe patch.
// Replaces Amethyst Rapier recipe and adds mithril ingots into the empty slots.
//
// Note:
// Vanilla shaped recipes cannot require 2 items in one crafting slot.
// This recipe consumes 4 mithril ingots, one in each previously empty slot.
// For exactly 8 mithril ingots, we need either a custom Forge recipe type
// or an intermediate component item in the custom Season I mod.

ServerEvents.recipes(event => {
  event.remove({ id: 'irons_spellbooks:amethyst_rapier' })

  event.shaped(
    Item.of('irons_spellbooks:amethyst_rapier', 1),
    [
      'MMA',
      'CAM',
      'WMC'
    ],
    {
      M: '#forge:ingots/mithril',
      A: 'minecraft:amethyst_shard',
      C: 'minecraft:chain',
      W: 'irons_spellbooks:weapon_parts'
    }
  ).id('season1:amethyst_rapier_mithril_rebalance')
})
