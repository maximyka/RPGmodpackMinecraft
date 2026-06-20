// Season1 - remove TravelOptics scrolls/items from Wandering Trader offers
// Forge 1.20.1 / KubeJS startup_scripts
// Path: kubejs/startup_scripts/season1_to_wandering_trader_filter.js
// Full restart required.

const ResourceLocation_TOFilter = Java.loadClass('net.minecraft.resources.ResourceLocation')
const ForgeRegistries_TOFilter = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')

function season1_to_stackBlocked(stack) {
  if (stack == null || stack.isEmpty()) return false
  const itemId = String(ForgeRegistries_TOFilter.ITEMS.getKey(stack.getItem()))
  if (itemId.startsWith('traveloptics:')) return true
  const tag = stack.getTag()
  if (tag != null && String(tag).indexOf('traveloptics:') >= 0) return true
  return false
}

function season1_to_cleanTrader(entity) {
  const typeId = String(ForgeRegistries_TOFilter.ENTITY_TYPES.getKey(entity.getType()))
  if (typeId != 'minecraft:wandering_trader') return
  const offers = entity.getOffers()
  for (let i = offers.size() - 1; i >= 0; i--) {
    const offer = offers.get(i)
    if (season1_to_stackBlocked(offer.getResult())) {
      offers.remove(i)
    }
  }
}

ForgeEvents.onEvent('net.minecraftforge.event.entity.EntityJoinLevelEvent', event => {
  season1_to_cleanTrader(event.getEntity())
})
