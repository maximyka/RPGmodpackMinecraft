// kubejs/server_scripts/season1_disable_reflection_necklace.js
//
// Season I hard blocker for Relics Reflecting Necklace / Отражающее ожерелье.

const SEASON1_DISABLED_RELIC_ID = 'relics:reflection_necklace';
const SEASON1_CHECK_INTERVAL_TICKS = 20 * 2;

let CuriosApi = null;
let ItemStack = null;
let BuiltInRegistries = null;

try {
  CuriosApi = Java.loadClass('top.theillusivec4.curios.api.CuriosApi');
  ItemStack = Java.loadClass('net.minecraft.world.item.ItemStack');
  BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  console.info('[Season I] Curios API loaded for reflection necklace blocker.');
} catch (error) {
  console.error('[Season I] Curios API was not loaded. Reflection necklace removal from Curios may not work.');
  console.error(String(error));
}

function season1GetMcPlayer(player) {
  try {
    if (player.minecraftEntity) return player.minecraftEntity;
  } catch (ignored) {}

  try {
    if (player.entity) return player.entity;
  } catch (ignored) {}

  return player;
}

function season1JavaStackItemId(stack) {
  try {
    if (!stack || stack.isEmpty()) return null;
    return String(BuiltInRegistries.ITEM.getKey(stack.getItem()));
  } catch (ignored) {}

  return null;
}

function season1ClearReflectionNecklaceFromInventory(player) {
  let removed = 0;

  try {
    removed += player.inventory.clear(SEASON1_DISABLED_RELIC_ID);
  } catch (error) {
    console.error('[Season I] Failed inventory.clear(string) for reflection necklace.');
    console.error(String(error));
  }

  return removed;
}

function season1ClearReflectionNecklaceFromCurios(player) {
  if (!CuriosApi || !ItemStack || !BuiltInRegistries) {
    return 0;
  }

  let removed = 0;

  try {
    const mcPlayer = season1GetMcPlayer(player);
    const optionalInventory = CuriosApi.getCuriosInventory(mcPlayer);

    if (!optionalInventory || !optionalInventory.isPresent()) {
      return 0;
    }

    const curiosInventory = optionalInventory.orElse(null);
    if (!curiosInventory) {
      return 0;
    }

    const curiosMap = curiosInventory.getCurios();
    const iterator = curiosMap.entrySet().iterator();

    while (iterator.hasNext()) {
      const entry = iterator.next();
      const handler = entry.getValue();

      if (!handler) continue;

      const stacks = handler.getStacks();
      if (!stacks) continue;

      const slots = stacks.getSlots();

      for (let slot = 0; slot < slots; slot++) {
        const stack = stacks.getStackInSlot(slot);
        const id = season1JavaStackItemId(stack);

        if (id === SEASON1_DISABLED_RELIC_ID) {
          stacks.setStackInSlot(slot, ItemStack.EMPTY);
          removed++;
        }
      }
    }
  } catch (error) {
    console.error('[Season I] Failed to remove reflection necklace from Curios slots.');
    console.error(String(error));
  }

  return removed;
}

function season1BlockReflectionNecklace(player, reason) {
  let removed = 0;

  removed += season1ClearReflectionNecklaceFromInventory(player);
  removed += season1ClearReflectionNecklaceFromCurios(player);

  if (removed > 0) {
    player.tell('§c[Season I] Отражающее ожерелье временно отключено: предмет ломает баланс боссов.');
    console.info(`[Season I] Removed ${SEASON1_DISABLED_RELIC_ID} from ${player.username}. count=${removed}, reason=${reason}`);
  }

  return removed;
}

ItemEvents.rightClicked(SEASON1_DISABLED_RELIC_ID, event => {
  event.cancel();
  event.player.tell('§c[Season I] Отражающее ожерелье временно запрещено.');
  season1BlockReflectionNecklace(event.player, 'right_click');
});

PlayerEvents.loggedIn(event => {
  season1BlockReflectionNecklace(event.player, 'login');
});

PlayerEvents.inventoryChanged(event => {
  const item = event.item;

  if (!item || item.empty) return;

  if (String(item.id) === SEASON1_DISABLED_RELIC_ID) {
    season1BlockReflectionNecklace(event.player, 'inventory_changed');
  }
});

ServerEvents.tick(event => {
  const server = event.server;

  if (server.tickCount % SEASON1_CHECK_INTERVAL_TICKS !== 0) {
    return;
  }

  server.players.forEach(player => {
    season1BlockReflectionNecklace(player, 'periodic_scan');
  });
});