// Season 1 - Tyros item attribute patch v8
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

// Stable UUIDs.
const IDS = {
  decrepit_damage: 'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1001',
  hellrazor_damage: 'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1002',
  hellrazor_speed:  'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1003',

  spellbreaker_damage:    'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1011',
  spellbreaker_speed:     'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1012',
  spellbreaker_resist:    'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1013',
  spellbreaker_kb_resist: 'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1014',
  spellbreaker_toughness: 'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1015',

  boreal_damage:          'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1021',
  boreal_speed:           'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1022',
  boreal_ice_power:       'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1023',
  boreal_entity_reach:    'c9f4a2c1-7dc9-4b72-9b0b-93d5dc2d1024',

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
  iceSpellPower: 'irons_spellbooks:ice_spell_power',
  spellResist: 'irons_spellbooks:spell_resist',
  castingMoveSpeed: 'irons_spellbooks:casting_movespeed',
  entityReach: 'forge:entity_reach'
}

ForgeEvents.onEvent('net.minecraftforge.event.ItemAttributeModifierEvent', event => {
  const id = itemId(event.getItemStack())
  const slot = event.getSlotType()

  // Weapons.
  if (id == 'irons_spellbooks:decrepit_scythe' && slot == EquipmentSlot.MAINHAND) {
    add(event, Attributes.ATTACK_DAMAGE, IDS.decrepit_damage, 'Season1 Tyros Decrepit Scythe damage', 14.0, Operation.ADDITION)
  }

  if (id == 'irons_spellbooks:hellrazor' && slot == EquipmentSlot.MAINHAND) {
    add(event, Attributes.ATTACK_DAMAGE, IDS.hellrazor_damage, 'Season1 Tyros Hellrazor damage', 17.0, Operation.ADDITION)
    add(event, Attributes.ATTACK_SPEED, IDS.hellrazor_speed, 'Season1 Tyros Hellrazor speed', 0.1, Operation.ADDITION)
  }

  // Spellbreaker final:
  // Displayed damage 20, attack speed 1.6.
  // Anti-magic tank profile: +10% Spell Resist, +10% Knockback Resistance, +2 Armor Toughness while held.
  if (id == 'irons_spellbooks:spellbreaker' && slot == EquipmentSlot.MAINHAND) {
    replace(event, Attributes.ATTACK_DAMAGE, IDS.spellbreaker_damage, 'Season1 Tyros Spellbreaker damage', 19.0, Operation.ADDITION)
    replace(event, Attributes.ATTACK_SPEED, IDS.spellbreaker_speed, 'Season1 Tyros Spellbreaker speed', -2.4, Operation.ADDITION)
    add(event, A.spellResist, IDS.spellbreaker_resist, 'Season1 Tyros Spellbreaker spell resist', 0.10, Operation.MULTIPLY_BASE)
    add(event, Attributes.KNOCKBACK_RESISTANCE, IDS.spellbreaker_kb_resist, 'Season1 Tyros Spellbreaker knockback resist', 0.10, Operation.ADDITION)
    add(event, Attributes.ARMOR_TOUGHNESS, IDS.spellbreaker_toughness, 'Season1 Tyros Spellbreaker toughness', 2.0, Operation.ADDITION)
  }

  // Boreal Blade final:
  // Displayed damage 30, attack speed 1.1.
  // Frost/control DPS profile: +10% Ice Spell Power, small entity reach bonus if Forge reach exists.
  if (id == 'irons_spellbooks:boreal_blade' && slot == EquipmentSlot.MAINHAND) {
    replace(event, Attributes.ATTACK_DAMAGE, IDS.boreal_damage, 'Season1 Tyros Boreal Blade damage', 29.0, Operation.ADDITION)
    replace(event, Attributes.ATTACK_SPEED, IDS.boreal_speed, 'Season1 Tyros Boreal Blade speed', -2.9, Operation.ADDITION)
    add(event, A.iceSpellPower, IDS.boreal_ice_power, 'Season1 Tyros Boreal Blade ice spell power', 0.10, Operation.MULTIPLY_BASE)
    add(event, A.entityReach, IDS.boreal_entity_reach, 'Season1 Tyros Boreal Blade entity reach', 0.25, Operation.ADDITION)
  }

  // Infernal Sorcerer Chestplate final:
  // Armor 9, Max Mana 200, Spell Power +15%, Fire Spell Power +15%.
  if (id == 'irons_spellbooks:infernal_sorcerer_chestplate' && slot == EquipmentSlot.CHEST) {
    replace(event, Attributes.ARMOR, IDS.infernal_armor, 'Season1 Tyros Infernal armor', 9.0, Operation.ADDITION)
    replace(event, A.maxMana, IDS.infernal_max_mana, 'Season1 Tyros Infernal max mana', 200.0, Operation.ADDITION)
    replace(event, A.spellPower, IDS.infernal_spell_pow, 'Season1 Tyros Infernal spell power', 0.15, Operation.MULTIPLY_BASE)
    replace(event, A.fireSpellPower, IDS.infernal_fire_pow, 'Season1 Tyros Infernal fire spell power', 0.15, Operation.MULTIPLY_BASE)
  }

  // Lightbringer / Paladin Chestplate final:
  // Armor 13, Toughness 5, Max Mana 250.
  // Generic Spell Power removed.
  // Holy Spell Power +15%.
  if (id == 'irons_spellbooks:paladin_chestplate' && slot == EquipmentSlot.CHEST) {
    replace(event, Attributes.ARMOR, IDS.light_armor, 'Season1 Tyros Lightbringer armor', 13.0, Operation.ADDITION)
    replace(event, Attributes.ARMOR_TOUGHNESS, IDS.light_toughness, 'Season1 Tyros Lightbringer toughness', 5.0, Operation.ADDITION)
    replace(event, A.maxMana, IDS.light_max_mana, 'Season1 Tyros Lightbringer max mana', 250.0, Operation.ADDITION)
    removeOnly(event, A.spellPower)
    replace(event, A.holySpellPower, IDS.light_holy_pow, 'Season1 Tyros Lightbringer holy spell power', 0.15, Operation.MULTIPLY_BASE)
  }

  // Boots of Speed final:
  // Armor 4, Movement Speed +27%, Casting Movement +65%, Spell Power +14%.
  // Max Mana remains original.
  if (id == 'irons_spellbooks:speed_boots' && slot == EquipmentSlot.FEET) {
    replace(event, Attributes.ARMOR, IDS.boots_armor, 'Season1 Tyros Speed Boots armor', 4.0, Operation.ADDITION)
    replace(event, Attributes.MOVEMENT_SPEED, IDS.boots_move, 'Season1 Tyros Speed Boots movement speed', 0.27, Operation.MULTIPLY_BASE)
    replace(event, A.castingMoveSpeed, IDS.boots_cast_move, 'Season1 Tyros Speed Boots casting movement', 0.65, Operation.MULTIPLY_BASE)
    replace(event, A.spellPower, IDS.boots_spell_pow, 'Season1 Tyros Speed Boots spell power', 0.14, Operation.MULTIPLY_BASE)
  }
})
