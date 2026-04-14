"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentConfigManager = void 0;
const shared_1 = require("@ha/shared");
const config_1 = require("./config");
const logger_1 = require("./logger");
class AgentConfigManager {
    constructor(ipcDeviceManager) {
        this.ipcDeviceManager = ipcDeviceManager;
    }
    get() {
        logger_1.logger.debug("AgentConfigManager.get()");
        const claudeLogin = config_1.desktopConfig.get("claudeLoginType");
        const codexLogin = config_1.desktopConfig.get("codexLoginType");
        const claudeModels = (0, shared_1.getSupportedModels)("claude", claudeLogin);
        const codexModels = (0, shared_1.getSupportedModels)("codex", codexLogin);
        return {
            claude: {
                loginType: config_1.desktopConfig.get("claudeLoginType"),
                apiKeyStored: Boolean(config_1.desktopConfig.get("claudeApiKey")),
                defaultModel: (0, shared_1.getDefaultModel)("claude", claudeLogin),
                supportedModels: claudeModels,
            },
            codex: {
                loginType: config_1.desktopConfig.get("codexLoginType"),
                apiKeyStored: Boolean(config_1.desktopConfig.get("codexApiKey")),
                defaultModel: (0, shared_1.getDefaultModel)("codex", codexLogin),
                supportedModels: codexModels,
            },
            allSupportedModels: [...claudeModels, ...codexModels],
        };
    }
    set(agentType, loginType, apiKey) {
        logger_1.logger.debug("AgentConfigManager.set()", agentType, loginType, Boolean(apiKey));
        if (agentType === "claude") {
            config_1.desktopConfig.set("claudeLoginType", loginType);
            if (apiKey) {
                config_1.desktopConfig.set("claudeApiKey", apiKey);
            }
        }
        else if (agentType === "codex") {
            config_1.desktopConfig.set("codexLoginType", loginType);
            if (apiKey) {
                config_1.desktopConfig.set("codexApiKey", apiKey);
            }
        }
        this.notify();
    }
    notify() {
        const agentConfig = this.get();
        logger_1.logger.debug("AgentConfigManager.notify()");
        this.ipcDeviceManager.notifyAll("agent-config-changed", agentConfig);
    }
}
exports.AgentConfigManager = AgentConfigManager;
