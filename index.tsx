export const pluginInfo = {
    id: "performanceModeToggle",
    name: "Performance Mode Toggle",
    description: "Adds a performance mode toggle button that optimizes Discord settings for better performance",
    color: "#7289da"
};

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Settings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { React, Button } from "@webpack/common";
import {
    addChatBarButton,
    removeChatBarButton,
    ChatBarButton,
} from "@api/ChatButtons";
import ErrorBoundary from "@components/ErrorBoundary";

// Discord settings we'll be modifying
const MessageDisplayCompact = getUserSettingLazy(
    "textAndImages",
    "messageDisplayCompact"
)!;
const EmbedLinks = getUserSettingLazy("textAndImages", "embedLinks")!;
const ShowCurrentGame = getUserSettingLazy("status", "showCurrentGame")!;

// Accessibility settings that may not exist in all Discord versions
let AnimatedEmoji: any = null;
let AutoPlayGifs: any = null;

// Try to get accessibility settings - they may not exist in all Discord versions
try {
    AnimatedEmoji = getUserSettingLazy("accessibility", "animatedEmoji");
} catch (e) {
    logger.warn("PerformanceModeToggle: animatedEmoji setting not available");
}

try {
    AutoPlayGifs = getUserSettingLazy("accessibility", "autoPlayGifs");
} catch (e) {
    logger.warn("PerformanceModeToggle: autoPlayGifs setting not available");
}

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Performance Mode",
        default: false,
    },
    disableEmbeds: {
        type: OptionType.BOOLEAN,
        description: "Disable auto-embed links",
        default: true,
    },
    compactMode: {
        type: OptionType.BOOLEAN,
        description: "Enable compact message mode",
        default: true,
    },
    disableAnimatedEmojis: {
        type: OptionType.BOOLEAN,
        description: "Disable animated emojis (reduces CPU usage)",
        default: true,
    },
    disableAutoPlayGifs: {
        type: OptionType.BOOLEAN,
        description: "Disable auto-play GIFs (saves bandwidth)",
        default: true,
    },
    disableActivityStatus: {
        type: OptionType.BOOLEAN,
        description: "Disable activity status sharing",
        default: true,
    },
    customCSS: {
        type: OptionType.BOOLEAN,
        description: "Apply custom performance CSS",
        default: true,
    },
});

// Store original settings to restore later
let originalSettings: Record<string, any> = {};

async function saveOriginalSettings() {
    originalSettings = {
        messageDisplayCompact: await MessageDisplayCompact.getSetting(),
        embedLinks: await EmbedLinks.getSetting(),
        showCurrentGame: await ShowCurrentGame.getSetting(),
    };

    // Save accessibility settings if they exist
    if (AnimatedEmoji) {
        try {
            originalSettings.animatedEmoji = await AnimatedEmoji.getSetting();
        } catch (e) {
            console.log(
                "PerformanceModeToggle: Could not save animatedEmoji setting"
            );
        }
    }

    if (AutoPlayGifs) {
        try {
            originalSettings.autoPlayGifs = await AutoPlayGifs.getSetting();
        } catch (e) {
            console.log(
                "PerformanceModeToggle: Could not save autoPlayGifs setting"
            );
        }
    }
}

async function applyPerformanceSettings() {
    await saveOriginalSettings();

    if (settings.store.disableEmbeds) {
        await EmbedLinks.updateSetting(false);
    }

    if (settings.store.compactMode) {
        await MessageDisplayCompact.updateSetting(true);
    }

    if (settings.store.disableAnimatedEmojis && AnimatedEmoji) {
        try {
            await AnimatedEmoji.updateSetting(false);
        } catch (e) {
            console.log(
                "PerformanceModeToggle: Could not update animatedEmoji setting"
            );
        }
    }

    if (settings.store.disableAutoPlayGifs && AutoPlayGifs) {
        try {
            await AutoPlayGifs.updateSetting(false);
        } catch (e) {
            console.log(
                "PerformanceModeToggle: Could not update autoPlayGifs setting"
            );
        }
    }

    if (settings.store.disableActivityStatus) {
        await ShowCurrentGame.updateSetting(false);
    }

    if (settings.store.customCSS) {
        document.body.classList.add("vc-performance-mode-enabled");
    }
}

async function restoreOriginalSettings() {
    if (Object.keys(originalSettings).length === 0) return;

    await MessageDisplayCompact.updateSetting(
        originalSettings.messageDisplayCompact
    );
    await EmbedLinks.updateSetting(originalSettings.embedLinks);
    await ShowCurrentGame.updateSetting(originalSettings.showCurrentGame);

    // Restore accessibility settings if they exist and were saved
    if (AnimatedEmoji && originalSettings.animatedEmoji !== undefined) {
        try {
            await AnimatedEmoji.updateSetting(originalSettings.animatedEmoji);
        } catch (e) {
            console.log(
                "PerformanceModeToggle: Could not restore animatedEmoji setting"
            );
        }
    }

    if (AutoPlayGifs && originalSettings.autoPlayGifs !== undefined) {
        try {
            await AutoPlayGifs.updateSetting(originalSettings.autoPlayGifs);
        } catch (e) {
            console.log(
                "PerformanceModeToggle: Could not restore autoPlayGifs setting"
            );
        }
    }

    // Remove performance CSS class
    document.body.classList.remove("vc-performance-mode-enabled");
}

import { Logger } from "@utils/Logger";

const logger = new Logger(pluginInfo.name, pluginInfo.color);

export default definePlugin({
    name: "Performance Mode Toggle",
    description:
        "Adds a performance mode toggle button that optimizes Discord settings for better performance",
    authors: [
        { name: "Bluscream", id: 0n },
        { name: "Cursor.AI", id: 0n },
    ],
    dependencies: ["UserSettingsAPI", "ChatInputButtonAPI"],
    settings,

    start() {
        // Add chat bar button
        addChatBarButton("performanceModeToggle", (props) => {
            return (
                <ChatBarButton
                    tooltip="Toggle Performance Mode"
                    onClick={async () => {
                        const newState = !settings.store.enabled;
                        settings.store.enabled = newState;

                        if (newState) {
                            await applyPerformanceSettings();
                        } else {
                            await restoreOriginalSettings();
                        }
                    }}
                >
                    {settings.store.enabled ? "⚡ ON" : "⚡"}
                </ChatBarButton>
            );
        });

        if (settings.store.enabled) {
            applyPerformanceSettings();
        }
    },

    stop() {
        // Remove chat bar button
        removeChatBarButton("performanceModeToggle");

        if (settings.store.enabled) {
            restoreOriginalSettings();
        }
    },

    settingsAboutComponent: () => {
        const { enabled } = settings.use(["enabled"]);

        return (
            <div>
                <div style={{ marginBottom: "1rem" }}>
                    <h3>Performance Mode Settings</h3>
                    <p>
                        Performance Mode optimizes Discord by disabling
                        resource-intensive features when enabled. The toggle
                        button appears in the voice panel for quick access.
                    </p>
                </div>

                {enabled && (
                    <div
                        style={{
                            padding: "1rem",
                            backgroundColor:
                                "var(--background-modifier-accent)",
                            borderRadius: "8px",
                            marginBottom: "1rem",
                        }}
                    >
                        <strong>⚡ Performance Mode is currently ACTIVE</strong>
                        <br />
                        Discord settings have been optimized for better
                        performance.
                    </div>
                )}

                <div style={{ marginBottom: "1rem" }}>
                    <h4>What Performance Mode does:</h4>
                    <ul style={{ marginLeft: "1rem" }}>
                        <li>
                            Disables auto-embed links (reduces network requests)
                        </li>
                        <li>
                            Enables compact message mode (less visual clutter)
                        </li>
                        <li>Disables animated emojis (reduces CPU usage)</li>
                        <li>Disables auto-play GIFs (saves bandwidth)</li>
                        <li>
                            Disables activity status sharing (reduces overhead)
                        </li>
                        <li>Applies custom CSS optimizations</li>
                    </ul>
                </div>

                <div
                    style={{
                        padding: "1rem",
                        backgroundColor: "var(--background-modifier-hover)",
                        borderRadius: "8px",
                        fontSize: "0.9em",
                    }}
                >
                    <strong>Note:</strong> Original settings are saved and
                    restored when you disable Performance Mode.
                </div>
            </div>
        );
    },
});
