// kubejs/server_scripts/season1_disable_reflection_necklace.js

const DISABLED_RELIC_ID = 'relics:reflection_necklace';

PlayerEvents.inventoryChanged(event => {
  const player = event.player;
  const item = event.item;

  if (!item || item.empty) return;
  if (String(item.id) !== DISABLED_RELIC_ID) return;

  player.tell('§c[Season I] Отражающий амулет временно запрещён для боссов. Не используйте его в рейдах.');
});