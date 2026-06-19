// Регистрация официальной кастомной статистики
StartupEvents.registry('custom_stat', event => {
    event.create('gun_shots')
    event.create('mana_spent')
})