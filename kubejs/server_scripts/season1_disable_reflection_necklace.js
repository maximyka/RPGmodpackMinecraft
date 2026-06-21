// kubejs/server_scripts/season1_disable_reflection_necklace.js
//
// Season I hard blocker for Relics Reflecting Necklace / Отражающее ожерелье.
// Fixed for Rhino/KubeJS: avoids repeated block-scoped declarations that can trigger
// "TypeError: redeclaration of var mcPlayer" in some KubeJS 1.20.1 environments.

var SEASON1_DISABLED_RELIC_ID = 'relics:reflection_necklace';
var SEASON1_CHECK_INTERVAL_TICKS = 20 * 2;

var Season1CuriosApi = null;
var Season1ItemStack = null;
var Season1BuiltInRegistries = null;

try {
  Season1CuriosApi = Java.loadClass('top.theillusivec4.curios.api.CuriosApi');
  Season1ItemStack = Java.loadClass('net.minecraft.world.item.ItemStack');
  Season1BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
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
    return String(Season1BuiltInRegistries.ITEM.getKey(stack.getItem()));
  } catch (ignored) {}

  return null;
}

function season1ClearReflectionNecklaceFromInventory(player) {
  var removed = 0;

  try {
    removed += player.inventory.clear(SEASON1_DISABLED_RELIC_ID);
  } catch (error) {
    console.error('[Season I] Failed inventory.clear(string) for reflection necklace.');
    console.error(String(error));
  }

  return removed;
}

function season1ClearReflectionNecklaceFromCurios(player) {
  if (!Season1CuriosApi || !Season1ItemStack || !Season1BuiltInRegistries) {
    return 0;
  }

  var removed = 0;

  try {
    var season1TargetPlayer = season1GetMcPlayer(player);
    var optionalInventory = Season1CuriosApi.getCuriosInventory(season1TargetPlayer);

    if (!optionalInventory || !optionalInventory.isPresent()) {
      return 0;
    }

    var curiosInventory = optionalInventory.orElse(null);
    if (!curiosInventory) {
      return 0;
    }

    var curiosMap = curiosInventory.getCurios();
    var iterator = curiosMap.entrySet().iterator();

    while (iterator.hasNext()) {
      var entry = iterator.next();
      var handler = entry.getValue();

      if (!handler) continue;

      var stacks = handler.getStacks();
      if (!stacks) continue;

      var slots = stacks.getSlots();

      for (var slot = 0; slot < slots; slot++) {
        var stack = stacks.getStackInSlot(slot);
        var id = season1JavaStackItemId(stack);

        if (id === SEASON1_DISABLED_RELIC_ID) {
          stacks.setStackInSlot(slot, Season1ItemStack.EMPTY);
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
  var removed = 0;

  removed += season1ClearReflectionNecklaceFromInventory(player);
  removed += season1ClearReflectionNecklaceFromCurios(player);

  if (removed > 0) {
    player.tell('§c[Season I] Отражающее ожерелье временно отключено: предмет ломает баланс боссов.');
    console.info('[Season I] Removed ' + SEASON1_DISABLED_RELIC_ID + ' from ' + player.username + '. count=' + removed + ', reason=' + reason);
  }

  return removed;
}

ItemEvents.rightClicked(SEASON1_DISABLED_RELIC_ID, function(event) {
  event.cancel();
  event.player.tell('§c[Season I] Отражающее ожерелье временно запрещено.');
  season1BlockReflectionNecklace(event.player, 'right_click');
});

PlayerEvents.loggedIn(function(event) {
  season1BlockReflectionNecklace(event.player, 'login');
});

PlayerEvents.inventoryChanged(function(event) {
  var item = event.item;

  if (!item || item.empty) return;

  if (String(item.id) === SEASON1_DISABLED_RELIC_ID) {
    season1BlockReflectionNecklace(event.player, 'inventory_changed');
  }
});

ServerEvents.tick(function(event) {
  var server = event.server;

  if (server.tickCount % SEASON1_CHECK_INTERVAL_TICKS !== 0) {
    return;
  }

  server.players.forEach(function(player) {
    season1BlockReflectionNecklace(player, 'periodic_scan');
  });
});
