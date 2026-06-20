// KubeJS Client Script - exit_on_disconnect.js
// Exits Minecraft when disconnected or if connection fails, preventing access to the vanilla menus.

let joinedOnce = false;

// Track when player successfully joins a world/server
ClientEvents.loggedIn(event => {
    joinedOnce = true;
});

// Listen to screen openings on Forge event bus
ForgeEvents.onEvent('net.minecraftforge.client.event.ScreenEvent$Opening', event => {
    let screen = event.getScreen();
    if (screen) {
        let name = screen.getClass().getName();
        // Exit game if disconnect screen, multiplayer list screen, or title screen (after playing) opens
        if (name.includes('DisconnectedScreen') || 
            name.includes('MultiplayerScreen') || 
            (joinedOnce && name.includes('TitleScreen'))) {
            
            console.log("RPG Modpack: Connection lost or menu accessed. Closing game.");
            java.lang.System.exit(0);
        }
    }
});
