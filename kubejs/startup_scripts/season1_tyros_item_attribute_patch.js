// Season I - Item attribute patch v11-fixed
// Forge 1.20.1 / KubeJS startup script
// Path: <server>/kubejs/startup_scripts/season1_tyros_item_attribute_patch.js
// Full server/client restart required. /reload is not enough.

const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
const ForgeRegistries = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')
const AttributeModifier = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier')
const Attributes = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
const EquipmentSlot = Java.loadClass('net.minecraft.world.entity.EquipmentSlot')
const UUID = Java.loadClass('java.util.UUID')

const Operation = AttributeModifier.Operation

const VANILLA_BASE_ATTACK_DAMAGE_UUID = 'cb3f55d3-645c-4f38-a497-9c13a33db5cf'
const VANILLA_BASE_ATTACK_SPEED_UUID = 'fa233e1c-4180-4865-b01b-bcce9785aca3'

function itemId(stack) {
  return String(ForgeRegistries.ITEMS.getKey(stack.getItem()))
}

function attr(id) {
  const value = ForgeRegistries.ATTRIBUTES.getValue(new ResourceLocation(id))
  if (value == null) console.warn(`[Season1Items] Missing attribute: ${id}`)
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

function replaceVanillaWeaponDamage(event, amount) {
  replace(event, Attributes.ATTACK_DAMAGE, VANILLA_BASE_ATTACK_DAMAGE_UUID, 'Weapon modifier', amount, Operation.ADDITION)
}

function replaceVanillaWeaponFinalSpeed(event, finalSpeed) {
  const itemModifier = finalSpeed - 4.0
  replace(event, Attributes.ATTACK_SPEED, VANILLA_BASE_ATTACK_SPEED_UUID, 'Weapon modifier', itemModifier, Operation.ADDITION)
}

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
  boots_spell_pow:   'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1304'
}

const A = {
  maxMana: 'irons_spellbooks:max_mana',
  spellPower: 'irons_spellbooks:spell_power',
  fireSpellPower: 'irons_spellbooks:fire_spell_power',
  holySpellPower: 'irons_spellbooks:holy_spell_power',
  castingMoveSpeed: 'irons_spellbooks:casting_movespeed'
}

ForgeEvents.onEvent('net.minecraftforge.event.ItemAttributeModifierEvent', event => {
  const id = itemId(event.getItemStack())
  const slot = event.getSlotType()

  if (id == 'irons_spellbooks:decrepit_scythe' && slot == EquipmentSlot.MAINHAND) {
    add(event, Attributes.ATTACK_DAMAGE, IDS.decrepit_damage, 'Season1 Tyros Decrepit Scythe damage', 14.0, Operation.ADDITION)
  }

  if (id == 'irons_spellbooks:hellrazor' && slot == EquipmentSlot.MAINHAND) {
    add(event, Attributes.ATTACK_DAMAGE, IDS.hellrazor_damage, 'Season1 Tyros Hellrazor damage', 17.0, Operation.ADDITION)
    add(event, Attributes.ATTACK_SPEED, IDS.hellrazor_speed, 'Season1 Tyros Hellrazor speed', 0.1, Operation.ADDITION)
  }

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

  if (id == 'irons_spellbooks:infernal_sorcerer_chestplate' && slot == EquipmentSlot.CHEST) {
    replace(event, Attributes.ARMOR, IDS.infernal_armor, 'Season1 Tyros Infernal armor', 9.0, Operation.ADDITION)
    replace(event, A.maxMana, IDS.infernal_max_mana, 'Season1 Tyros Infernal max mana', 200.0, Operation.ADDITION)
    replace(event, A.spellPower, IDS.infernal_spell_pow, 'Season1 Tyros Infernal spell power', 0.15, Operation.MULTIPLY_BASE)
    replace(event, A.fireSpellPower, IDS.infernal_fire_pow, 'Season1 Tyros Infernal fire spell power', 0.15, Operation.MULTIPLY_BASE)
  }

  if (id == 'irons_spellbooks:paladin_chestplate' && slot == EquipmentSlot.CHEST) {
    replace(event, Attributes.ARMOR, IDS.light_armor, 'Season1 Tyros Lightbringer armor', 13.0, Operation.ADDITION)
    replace(event, Attributes.ARMOR_TOUGHNESS, IDS.light_toughness, 'Season1 Tyros Lightbringer toughness', 5.0, Operation.ADDITION)
    replace(event, A.maxMana, IDS.light_max_mana, 'Season1 Tyros Lightbringer max mana', 250.0, Operation.ADDITION)
    removeOnly(event, A.spellPower)
    replace(event, A.holySpellPower, IDS.light_holy_pow, 'Season1 Tyros Lightbringer holy spell power', 0.15, Operation.MULTIPLY_BASE)
  }

  if (id == 'irons_spellbooks:speed_boots' && slot == EquipmentSlot.FEET) {
    replace(event, Attributes.ARMOR, IDS.boots_armor, 'Season1 Tyros Speed Boots armor', 4.0, Operation.ADDITION)
    replace(event, Attributes.MOVEMENT_SPEED, IDS.boots_move, 'Season1 Tyros Speed Boots movement speed', 0.27, Operation.MULTIPLY_BASE)
    replace(event, A.castingMoveSpeed, IDS.boots_cast_move, 'Season1 Tyros Speed Boots casting movement', 0.65, Operation.MULTIPLY_BASE)
    replace(event, A.spellPower, IDS.boots_spell_pow, 'Season1 Tyros Speed Boots spell power', 0.14, Operation.MULTIPLY_BASE)
  }
})
