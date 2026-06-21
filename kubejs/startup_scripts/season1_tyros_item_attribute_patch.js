// Season 1 - Tyros item attribute patch v7
// Forge 1.20.1 / KubeJS startup script
// Path: <server>/kubejs/startup_scripts/season1_tyros_item_attribute_patch.js
// Full server restart required. /reload is not enough.

const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
const ForgeRegistries = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')
const AttributeModifier = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier')
const Attributes = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
const EquipmentSlot = Java.loadClass('net.minecraft.world.entity.EquipmentSlot')
const UUID = Java.loadClass('java.util.UUID')

const Operation = AttributeModifier.Operation

function itemId(stack) {
  return String(ForgeRegistries.ITEMS.getKey(stack.getItem()))
}

function attr(id) {
  const value = ForgeRegistries.ATTRIBUTES.getValue(new ResourceLocation(id))
  if (value == null) console.warn(`[Season1Tyros] Missing attribute: ${id}`)
  return value
}

function resolveAttribute(attributeIdOrObject) {
  if (typeof attributeIdOrObject === 'string') return attr(attributeIdOrObject)
  return attributeIdOrObject
}

function add(event, attributeIdOrObject, uuid, name, amount, operation) {
  if (amount == 0) return
  const attribute = resolveAttribute(attributeIdOrObject)
  if (attribute == null) return
  event.addModifier(attribute, new AttributeModifier(UUID.fromString(uuid), name, amount, operation))
}

function removeAllForAttribute(event, attributeIdOrObject) {
  const attribute = resolveAttribute(attributeIdOrObject)
  if (attribute == null) return

  const modifiers = event.getModifiers().get(attribute).toArray()
  for (let i = 0; i < modifiers.length; i++) {
    event.removeModifier(attribute, modifiers[i])
  }
}

function replace(event, attributeIdOrObject, uuid, name, amount, operation) {
  const attribute = resolveAttribute(attributeIdOrObject)
  if (attribute == null) return
  removeAllForAttribute(event, attribute)
  add(event, attribute, uuid, name, amount, operation)
}

function removeOnly(event, attributeIdOrObject) {
  const attribute = resolveAttribute(attributeIdOrObject)
  if (attribute == null) return
  removeAllForAttribute(event, attribute)
}

// Vanilla weapon UUIDs.
// These are critical for tooltip aggregation.
// If attack speed uses a random custom UUID, some tooltip mods show a red raw modifier like "-2.4 Скорость атаки".
// With the vanilla speed UUID, the tooltip should aggregate it like a normal sword:
// "Скорость атаки: 1.6 [Сущность: 4 | Предмет: -2.4]".
const VANILLA_BASE_ATTACK_DAMAGE_UUID = 'cb3f55d3-645c-4f38-a497-9c13a33db5cf'
const VANILLA_BASE_ATTACK_SPEED_UUID = 'fa233e1c-4180-4865-b01b-bcce9785aca3'

function replaceVanillaWeaponDamage(event, amount) {
  replace(event, Attributes.ATTACK_DAMAGE, VANILLA_BASE_ATTACK_DAMAGE_UUID, 'Weapon modifier', amount, Operation.ADDITION)
}

function replaceVanillaWeaponFinalSpeed(event, finalSpeed) {
  // Minecraft internally stores weapon attack speed as:
  // final_speed = player_base_4.0 + item_modifier.
  // A normal sword is final 1.6, internally stored as -2.4.
  const itemModifier = finalSpeed - 4.0
  replace(event, Attributes.ATTACK_SPEED, VANILLA_BASE_ATTACK_SPEED_UUID, 'Weapon modifier', itemModifier, Operation.ADDITION)
}

// Stable UUIDs.
const IDS = {
  decrepit_damage: 'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1001',
  hellrazor_damage: 'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1002',
  hellrazor_speed:  'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1003',

  infernal_armor:      'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1101',
  infernal_max_mana:   'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1102',
  infernal_spell_pow:  'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1103',
  infernal_fire_pow:   'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1104',

  light_armor:       'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1201',
  light_toughness:   'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1202',
  light_max_mana:    'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1203',
  light_holy_pow:    'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1205',

  boots_armor:       'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1301',
  boots_move:        'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1302',
  boots_cast_move:   'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1303',
  boots_spell_pow:   'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1304',


  // Iron's weapon balance fixes.
  //
  // These use vanilla weapon UUIDs so tooltip mods can aggregate attack speed correctly.
  // Human-readable final attack speeds:
  // - Spellbreaker: 1.6, normal sword-like speed for counterspell gameplay.
  // - Boreal Blade: 1.0, heavy slow two-handed weapon.
  // - Twilight Gale: 1.5, spear/trident-like speed.
  // - Amethyst Rapier: 2.3, fast rapier speed.

  if (id == 'irons_spellbooks:spellbreaker' && slot == EquipmentSlot.MAINHAND) {
    replaceVanillaWeaponDamage(event, 19.0)
    replaceVanillaWeaponFinalSpeed(event, 1.6)
  }

  if (id == 'irons_spellbooks:boreal_blade' && slot == EquipmentSlot.MAINHAND) {
    replaceVanillaWeaponDamage(event, 29.0)
    replaceVanillaWeaponFinalSpeed(event, 1.0)
  }

  if (id == 'irons_spellbooks:twilight_gale' && slot == EquipmentSlot.MAINHAND) {
    replaceVanillaWeaponDamage(event, 18.0)
    replaceVanillaWeaponFinalSpeed(event, 1.5)
  }

  if (id == 'irons_spellbooks:amethyst_rapier' && slot == EquipmentSlot.MAINHAND) {
    replaceVanillaWeaponDamage(event, 14.0)
    replaceVanillaWeaponFinalSpeed(event, 2.3)
  }

})
