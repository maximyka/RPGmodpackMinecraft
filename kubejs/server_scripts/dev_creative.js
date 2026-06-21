// KubeJS Server Script - dev_creative.js
// Sets game mode to creative for developers on login if devMode is enabled.

PlayerEvents.loggedIn(event => {
    try {
        let System = Java.loadClass('java.lang.System');
        if (System.getProperty('devMode') === 'true') {
            event.server.runCommandSilent('/gamemode creative ' + event.player.username);
            console.log("RPG Modpack: Dev Mode - Set " + event.player.username + " to Creative Mode");
        }
    } catch (e) {
        console.error("RPG Modpack: Failed to set creative mode: " + e);
    }
});
